import type { WorkshopData, WorkshopOperation, WorkshopDay, WorkshopActivity } from '../shared/workshop';
import type { StorageAdapter } from './database';
import type { DatabaseDocument } from './models';

type Snapshot={database:DatabaseDocument;sha:string|null;syncedAt:number};
type Row={id:string;data:string};
// SQL is the canonical pilot snapshot. Parent/child/person links are real foreign
// keys; descriptive fields and revision metadata are JSON columns on each row.
// Core v1 records and all v2 tables commit together, including wagon + operation.
export class WorkshopSqlStorage implements StorageAdapter {
 private initialized=false;
 constructor(private readonly storage:DurableObjectStorage){}
 private init(){
  if(this.initialized)return;
  this.storage.sql.exec(`
   CREATE TABLE IF NOT EXISTS workshop_snapshot (id TEXT PRIMARY KEY, data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_people (id TEXT PRIMARY KEY, data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_shifts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_standards (id TEXT PRIMARY KEY, job_id INTEGER NOT NULL, data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_days (id TEXT PRIMARY KEY, date TEXT NOT NULL, shift_id TEXT NOT NULL REFERENCES workshop_shifts(id), data TEXT NOT NULL, UNIQUE(date,shift_id));
   CREATE TABLE IF NOT EXISTS workshop_attendance (day_id TEXT NOT NULL REFERENCES workshop_days(id), person_id TEXT NOT NULL REFERENCES workshop_people(id), data TEXT NOT NULL, PRIMARY KEY(day_id,person_id));
   CREATE TABLE IF NOT EXISTS workshop_orders (id TEXT PRIMARY KEY, data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_lines (order_id TEXT NOT NULL REFERENCES workshop_orders(id), standard_id TEXT NOT NULL REFERENCES workshop_standards(id), job_id INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(order_id,job_id));
   CREATE TABLE IF NOT EXISTS workshop_participation (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES workshop_orders(id), day_id TEXT NOT NULL REFERENCES workshop_days(id), data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_participation_people (participation_id TEXT NOT NULL REFERENCES workshop_participation(id), person_id TEXT NOT NULL REFERENCES workshop_people(id), PRIMARY KEY(participation_id,person_id));
   CREATE TABLE IF NOT EXISTS workshop_waits (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES workshop_orders(id), data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_wait_people (wait_id TEXT NOT NULL REFERENCES workshop_waits(id), person_id TEXT NOT NULL REFERENCES workshop_people(id), PRIMARY KEY(wait_id,person_id));
   CREATE TABLE IF NOT EXISTS workshop_activities (id TEXT PRIMARY KEY, day_id TEXT NOT NULL REFERENCES workshop_days(id), order_id TEXT REFERENCES workshop_orders(id), data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS workshop_activity_people (activity_id TEXT NOT NULL REFERENCES workshop_activities(id), person_id TEXT NOT NULL REFERENCES workshop_people(id), PRIMARY KEY(activity_id,person_id));
   CREATE INDEX IF NOT EXISTS workshop_participation_day ON workshop_participation(day_id);
   CREATE INDEX IF NOT EXISTS workshop_activity_day ON workshop_activities(day_id);
  `);
  this.initialized=true;
 }
 private rows<T>(table:string):T[]{return this.storage.sql.exec<{data:string}>(`SELECT data FROM ${table} ORDER BY rowid`).toArray().map(r=>JSON.parse(r.data) as T);}
 async get<T>(key:string):Promise<T|undefined>{
  if(key!=='snapshot')return this.storage.get<T>(key);
  this.init();const row=this.storage.sql.exec<Row>('SELECT id,data FROM workshop_snapshot WHERE id=?','snapshot').toArray()[0];
  // Migration is additive: retain the old KV snapshot. Never fabricate people
  // or wait timestamps from legacy aggregate operations.
  if(!row)return this.storage.get<T>(key);
  const snapshot=JSON.parse(row.data) as Snapshot;
  const data:WorkshopData={formulaVersion:2,people:this.rows('workshop_people'),shifts:this.rows('workshop_shifts'),standards:this.rows('workshop_standards'),days:[],operations:[],activities:[]};
  const attendance=this.storage.sql.exec<{day_id:string;data:string}>('SELECT day_id,data FROM workshop_attendance ORDER BY rowid').toArray();
  data.days=this.rows<Omit<WorkshopDay,'attendance'>>('workshop_days').map(d=>({...d,attendance:attendance.filter(a=>a.day_id===d.id).map(a=>JSON.parse(a.data))}));
  const lines=this.storage.sql.exec<{order_id:string;data:string}>('SELECT order_id,data FROM workshop_lines ORDER BY rowid').toArray();
  const participation=this.storage.sql.exec<{id:string;order_id:string;data:string}>('SELECT id,order_id,data FROM workshop_participation ORDER BY rowid').toArray();
  const participationPeople=this.storage.sql.exec<{participation_id:string;person_id:string}>('SELECT participation_id,person_id FROM workshop_participation_people ORDER BY rowid').toArray();
  const waits=this.storage.sql.exec<{id:string;order_id:string;data:string}>('SELECT id,order_id,data FROM workshop_waits ORDER BY rowid').toArray();
  const waitPeople=this.storage.sql.exec<{wait_id:string;person_id:string}>('SELECT wait_id,person_id FROM workshop_wait_people ORDER BY rowid').toArray();
  data.operations=this.rows<Omit<WorkshopOperation,'jobs'|'participation'|'waits'>>('workshop_orders').map(o=>({...o,
   jobs:lines.filter(j=>j.order_id===o.id).map(j=>JSON.parse(j.data)),
   participation:participation.filter(p=>p.order_id===o.id).map(p=>({...JSON.parse(p.data),personIds:participationPeople.filter(r=>r.participation_id===p.id).map(r=>r.person_id)})),
   waits:waits.filter(w=>w.order_id===o.id).map(w=>({...JSON.parse(w.data),personIds:waitPeople.filter(r=>r.wait_id===w.id).map(r=>r.person_id)}))}));
  const activityPeople=this.storage.sql.exec<{activity_id:string;person_id:string}>('SELECT activity_id,person_id FROM workshop_activity_people ORDER BY rowid').toArray();
  data.activities=this.rows<Omit<WorkshopActivity,'personIds'>>('workshop_activities').map(a=>({...a,personIds:activityPeople.filter(p=>p.activity_id===a.id).map(p=>p.person_id)}));
  snapshot.database.workshop=data;return snapshot as T;
 }
 async put<T>(key:string,value:T):Promise<void>{
  if(key!=='snapshot')return this.storage.put(key,value);
  this.init();const snapshot=value as Snapshot;const {workshop,...core}=snapshot.database;
  if(!workshop)throw new Error('Workshop snapshot required');
  this.storage.transactionSync(()=>{
   for(const table of ['activity_people','activities','wait_people','waits','participation_people','participation','lines','orders','attendance','days','standards','shifts','people'])this.storage.sql.exec(`DELETE FROM workshop_${table}`);
   for(const p of workshop.people)this.storage.sql.exec('INSERT INTO workshop_people VALUES (?,?)',p.id,JSON.stringify(p));
   for(const s of workshop.shifts)this.storage.sql.exec('INSERT INTO workshop_shifts VALUES (?,?)',s.id,JSON.stringify(s));
   for(const s of workshop.standards)this.storage.sql.exec('INSERT INTO workshop_standards VALUES (?,?,?)',s.versionId,s.id,JSON.stringify(s));
   for(const d of workshop.days){const {attendance,...header}=d;this.storage.sql.exec('INSERT INTO workshop_days VALUES (?,?,?,?)',d.id,d.date,d.shiftId,JSON.stringify(header));for(const a of attendance)this.storage.sql.exec('INSERT INTO workshop_attendance VALUES (?,?,?)',d.id,a.personId,JSON.stringify(a));}
   for(const o of workshop.operations){const {jobs,participation,waits,...header}=o;this.storage.sql.exec('INSERT INTO workshop_orders VALUES (?,?)',o.id,JSON.stringify(header));
    for(const j of jobs)this.storage.sql.exec('INSERT INTO workshop_lines VALUES (?,?,?,?)',o.id,j.versionId,j.id,JSON.stringify(j));
    participation.forEach((p,index)=>{const {personIds,...body}=p,id=`${o.id}:p:${index}`;this.storage.sql.exec('INSERT INTO workshop_participation VALUES (?,?,?,?)',id,o.id,p.dayId,JSON.stringify(body));for(const personId of personIds)this.storage.sql.exec('INSERT INTO workshop_participation_people VALUES (?,?)',id,personId);});
    waits.forEach((w,index)=>{const {personIds,...body}=w,id=`${o.id}:w:${index}`;this.storage.sql.exec('INSERT INTO workshop_waits VALUES (?,?,?)',id,o.id,JSON.stringify(body));for(const personId of personIds)this.storage.sql.exec('INSERT INTO workshop_wait_people VALUES (?,?)',id,personId);});
   }
   for(const a of workshop.activities){const {personIds,...header}=a;this.storage.sql.exec('INSERT INTO workshop_activities VALUES (?,?,?,?)',a.id,a.dayId,a.operationId,JSON.stringify(header));for(const personId of personIds)this.storage.sql.exec('INSERT INTO workshop_activity_people VALUES (?,?)',a.id,personId);}
   this.storage.sql.exec('INSERT INTO workshop_snapshot VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data','snapshot',JSON.stringify({...snapshot,database:core}));
  });
 }
}
