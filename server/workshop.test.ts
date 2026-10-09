import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { calculateOperation, turkeyTime, type WorkshopData, type WorkshopOperation } from '../shared/workshop';
import { VagonDatabase, type Env } from './index';
import { DatabaseEngine, type StorageAdapter } from './database';

const PASSWORD='test-workshop-password-123';
const env={STORAGE_MODE:'local',MAINTENANCE_ENABLED:'true',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:PASSWORD,SESSION_SECRET:'test-only-workshop-session-key-long-enough'} as Env;
class SqlMemory {
 readonly database=new DatabaseSync(':memory:');values=new Map<string,unknown>();failWrite=false;
 constructor(){this.database.exec('PRAGMA foreign_keys=ON');}
 sql={exec:(query:string,...bindings:unknown[])=>{
  if(query.includes('CREATE TABLE')){this.database.exec(query);return{toArray:()=>[]};}
  if(this.failWrite&&query.startsWith('INSERT INTO workshop_orders'))throw new Error('Injected SQL write failure');
  const rows=this.database.prepare(query).all(...bindings as (string|number|null)[]);return{toArray:()=>rows};
 }};
 transactionSync<T>(action:()=>T):T{this.database.exec('BEGIN');try{const r=action();this.database.exec('COMMIT');return r;}catch(e){this.database.exec('ROLLBACK');throw e;}}
 async get<T>(key:string){return structuredClone(this.values.get(key)) as T|undefined;}
 async put<T>(key:string,value:T){this.values.set(key,structuredClone(value));}
 close(){this.database.close();}
}
const stores:SqlMemory[]=[];
afterEach(()=>{for(const s of stores.splice(0))s.close();});
function make(storage?:SqlMemory,config=env){const s=storage??new SqlMemory();if(!storage)stores.push(s);return{storage:s,object:new VagonDatabase({storage:s} as unknown as DurableObjectState,config)};}
async function call(o:VagonDatabase,path:string,method='GET',value?:unknown,session?:string,origin='https://test.example'){
 return o.fetch(new Request('https://test.example'+path,{method,headers:{...(method!=='GET'?{Origin:origin}:{}),...(value?{'Content-Type':'application/json'}:{}),...(session?{Cookie:session}:{})},...(value?{body:JSON.stringify(value)}:{})}));
}
async function login(o:VagonDatabase,username='admin',password=PASSWORD){const r=await call(o,'/api/login','POST',{username,password});expect(r.status).toBe(200);return r.headers.get('set-cookie')!.split(';')[0];}
const at=(clock:string,date='2026-10-09')=>turkeyTime(date,clock);
async function prepared(){const fixture=make(),session=await login(fixture.object),ids:string[]=[];
 for(const name of ['A','B','C']){const r=await call(fixture.object,'/api/workshop/people','POST',{name,active:true},session);expect(r.status).toBe(201);ids.push((await r.json() as {record:{id:string}}).record.id);}
 const day={date:'2026-10-09',shiftId:'1',startedAt:at('08:00'),finishedAt:at('16:00'),breaks:[{startedAt:at('12:00'),finishedAt:at('12:30')}],attendance:ids.map(personId=>({personId,startedAt:at('08:00'),finishedAt:at('16:00')})),wagonAvailable:true,noWagonReason:'',notes:'',fullNoWagon:false};
 const r=await call(fixture.object,'/api/workshop/days','POST',day,session);expect(r.status).toBe(201);const dayId=(await r.json() as {record:{id:string}}).record.id;
 const input={wagonNumber:'V2-TEST',startedAt:at('09:00'),finishedAt:at('11:00'),supervisor:'Test Amir',notes:'',participation:[{dayId,personIds:ids,startedAt:at('09:00'),finishedAt:at('11:00')}],waits:[{startedAt:at('10:00'),finishedAt:at('10:30'),personIds:[ids[0]],reason:'Malzeme/Valf Tedarik',note:''}],jobs:[{jobTypeId:1,quantity:16}]};
 return{...fixture,session,ids,day,dayId,input};
}
async function listing(o:VagonDatabase,session:string){return await(await call(o,'/api/workshop','GET',undefined,session)).json() as WorkshopData;}
describe('relational pilot API',()=>{
 it('persists person selection, original standards, revisions and normalized SQL links across restart',async()=>{const {object,storage,session,input}=await prepared();const r=await call(object,'/api/workshop/operations','POST',input,session);expect(r.status).toBe(201);const {record}=await r.json() as {record:WorkshopOperation};expect(record.formulaVersion).toBe(2);
  expect(storage.database.prepare('SELECT COUNT(*) AS n FROM workshop_participation_people').get()?.n).toBe(3);expect(storage.database.prepare('SELECT COUNT(*) AS n FROM workshop_wait_people').get()?.n).toBe(1);expect(storage.database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  const restored=make(storage).object,data=await listing(restored,session);expect(data.operations[0]).toEqual(record);expect(calculateOperation(record,data.days).waitingLabor).toBe(0.5);
  expect((await call(restored,'/api/workshop/operations/'+record.id,'PATCH',{...input,notes:'Changed',revision:1},session)).status).toBe(200);expect((await call(restored,'/api/workshop/operations/'+record.id,'PATCH',{...input,revision:1},session)).status).toBe(409);
 });
 it('blocks overlaps, wrong wait assignments, lunch losses and duplicate day/shift on the server',async()=>{const {object,session,input,ids,day,dayId}=await prepared();expect((await call(object,'/api/workshop/operations','POST',input,session)).status).toBe(201);const duplicate=await call(object,'/api/workshop/operations','POST',{...input,wagonNumber:'SECOND'},session);expect(duplicate.status).toBe(400);const duplicateError=(await duplicate.json() as {error:string}).error;expect(duplicateError).toContain('A, B, C');expect(duplicateError).toContain('V2-TEST numaralı vagonun bakımı');expect(duplicateError).toContain('SECOND numaralı vagonun bakımı');expect(duplicateError).toContain('09:00');expect(duplicateError).toContain('gerçek bitiş saatlerini doğrulayın');
  expect((await call(object,'/api/workshop/days','POST',day,session)).status).toBe(400);
  const activity={dayId,operationId:null,kind:'no-wagon',reason:'Sevk',notes:'',personIds:[ids[0]],startedAt:at('09:00'),finishedAt:at('10:00')};const activityResponse=await call(object,'/api/workshop/activities','POST',activity,session);expect(activityResponse.status).toBe(400);const activityError=(await activityResponse.json() as {error:string}).error;expect(activityError).toContain('V2-TEST numaralı vagonun bakımı');expect(activityError).toContain('Vagonsuzluk kaydı');expect(activityError).toContain('A:');
  const waitingOverlap=await call(object,'/api/workshop/activities','POST',{...activity,startedAt:at('10:00'),finishedAt:at('10:30')},session);expect(waitingOverlap.status).toBe(400);expect((await waitingOverlap.json() as {error:string}).error).toContain('V2-TEST numaralı vagonun bakım içi beklemesi');
  expect((await call(object,'/api/workshop/activities','POST',{...activity,startedAt:at('12:00'),finishedAt:at('12:30')},session)).status).toBe(400);
  expect((await call(object,'/api/workshop/operations','POST',{...input,startedAt:at('13:00'),finishedAt:at('14:00'),participation:[{dayId,personIds:[ids[1]],startedAt:at('13:00'),finishedAt:at('14:00')}],waits:[{...input.waits[0],personIds:[ids[0]],startedAt:at('13:00'),finishedAt:at('13:30')}]},session)).status).toBe(400);
 });
 it('allows different people to work concurrently and serializes conflicting submissions',async()=>{const {object,session,input,ids}=await prepared();const request=(personId:string)=>({...input,participation:[{...input.participation[0],personIds:[personId]}],waits:[]});const responses=await Promise.all([call(object,'/api/workshop/operations','POST',request(ids[0]),session),call(object,'/api/workshop/operations','POST',request(ids[0]),session)]);expect(responses.map(r=>r.status).sort()).toEqual([201,400]);expect((await call(object,'/api/workshop/operations','POST',request(ids[1]),session)).status).toBe(201);});
 it('creates a wagon plus maintenance atomically and rolls both back on validation or SQL failure',async()=>{const {object,storage,session,input}=await prepared();const wagon={number:input.wagonNumber,wagonType:'Sgss-w',entryDate:'2026-10-09',channelDate:'',completedDate:'',status:'Bekliyor',notes:''};
  expect((await call(object,'/api/workshop/operations/with-wagon','POST',{wagon,operation:{...input,waits:[{...input.waits[0],finishedAt:at('16:00')}] }},session)).status).toBe(400);
  storage.failWrite=true;expect((await call(object,'/api/workshop/operations/with-wagon','POST',{wagon,operation:input},session)).status).toBe(500);storage.failWrite=false;
  const restart=make(storage).object;expect((await listing(restart,session)).operations).toHaveLength(0);expect((await(await call(restart,'/api/data','GET',undefined,session)).json() as {wagons:unknown[]}).wagons).toHaveLength(0);
  expect((await call(restart,'/api/workshop/operations/with-wagon','POST',{wagon,operation:input},session)).status).toBe(201);const restored=make(storage).object;expect((await listing(restored,session)).operations).toHaveLength(1);expect((await(await call(restored,'/api/data','GET',undefined,session)).json() as {wagons:unknown[]}).wagons).toHaveLength(1);
 });
 it('records a full no-wagon shift with 22.5 AS and prevents maintenance in it',async()=>{const {object,session,dayId,day,input}=await prepared();expect((await call(object,'/api/workshop/days/'+dayId,'PATCH',{...day,revision:1,wagonAvailable:false,noWagonReason:'Manevra iptali',fullNoWagon:true},session)).status).toBe(200);const data=await listing(object,session);expect(data.activities).toHaveLength(3);expect(data.activities.reduce((n,a)=>n+(Date.parse(a.finishedAt)-Date.parse(a.startedAt))/3600000,0)).toBe(24);expect((await call(object,'/api/workshop/operations','POST',input,session)).status).toBe(400);
  expect((await call(object,'/api/workshop/days/'+dayId,'PATCH',{...day,revision:2,wagonAvailable:false,noWagonReason:'',fullNoWagon:true},session)).status).toBe(400);
 });
 it('preserves old KV aggregate records during additive SQL migration',async()=>{const storage=new SqlMemory();stores.push(storage);const engine=new DatabaseEngine(storage as StorageAdapter,{...env,MAINTENANCE_ENABLED:undefined});const db=await engine.load();expect(db.workshop).toBeUndefined();db.maintenanceOperations=[];await engine.mutate(d=>{d.maintenanceOperations=[{id:'legacy',revision:1,createdAt:at('08:00'),updatedAt:at('08:00'),updatedBy:db.users[0].id,wagonNumber:'OLD',startedAt:at('09:00'),finishedAt:at('11:00'),shift:'3. Vardiya',personnel:3,supervisor:'Old',notes:'',jobs:[{id:1,name:'Sabo',category:'Fren',standardMinutes:5,quantity:1}],waits:[{reason:'Manevra Bekleme',minutes:30,note:''}]}];});
  const object=make(storage).object,session=await login(object),response=await call(object,'/api/workshop','GET',undefined,session),data=await response.json() as WorkshopData&{legacyOperations:unknown[]};expect(data.legacyOperations).toHaveLength(1);expect(data.people).toHaveLength(0);expect(data.operations).toHaveLength(0);expect(storage.values.has('snapshot')).toBe(true);expect(data.shifts.map(s=>s.id)).toEqual(['1','2']);
 });
 it('restricts personnel/settings/deletion to admins, protects origins, and disables v2 in production',async()=>{const {object,session,input}=await prepared();expect((await call(object,'/api/workshop')).status).toBe(401);await call(object,'/api/admin/users','POST',{username:'operator',displayName:'Operator',password:PASSWORD,role:'user'},session);const operator=await login(object,'operator');expect((await call(object,'/api/workshop/people','POST',{name:'X',active:true},operator)).status).toBe(403);expect((await call(object,'/api/workshop/shifts','PUT',{shifts:(await listing(object,session)).shifts},operator)).status).toBe(403);
  const response=await call(object,'/api/workshop/operations','POST',input,operator);expect(response.status).toBe(201);const record=(await response.json() as {record:WorkshopOperation}).record;expect((await call(object,'/api/workshop/operations/'+record.id,'DELETE',{revision:1},operator)).status).toBe(403);expect((await call(object,'/api/workshop/operations','POST',input,operator,'https://other.example')).status).toBe(403);expect((await call(make(undefined,{...env,MAINTENANCE_ENABLED:undefined}).object,'/api/workshop')).status).toBe(404);
 });
 it('adds catalog versions without changing existing workload and permits person deactivation',async()=>{const {object,session,input,ids}=await prepared();expect((await call(object,'/api/workshop/operations','POST',input,session)).status).toBe(201);expect((await call(object,'/api/workshop/standards','POST',{jobTypeId:1,name:'Sabo sök-tak (1 adet)',category:'Fren & Mekanik',standardMinutes:8,active:true,validFrom:at('12:00')},session)).status).toBe(201);const data=await listing(object,session);expect(data.operations[0].jobs[0].standardMinutes).toBe(5);expect((await call(object,'/api/workshop/people/'+ids[0],'PATCH',{name:'A',active:false,revision:1},session)).status).toBe(200);const restored=await listing(object,session);expect(restored.people.find(p=>p.id===ids[0])?.active).toBe(false);expect(restored.operations[0].jobs[0].standardMinutes).toBe(5);expect((await call(object,'/api/workshop/operations','POST',{...input,startedAt:at('14:00'),finishedAt:at('15:00'),participation:[{...input.participation[0],startedAt:at('14:00'),finishedAt:at('15:00')}],waits:[]},session)).status).toBe(400);
 });
});

it('rejects missing work, crew and wait selections with Turkish field-specific messages without saving',async()=>{
 const f=await prepared();
 for(const [input,message] of [
  [{...f.input,jobs:[]},'En az bir yapılan iş seçin.'],
  [{...f.input,participation:[]},'En az bir personel / vardiya katılımı ekleyin.'],
  [{...f.input,participation:[{...f.input.participation[0],personIds:[]}]},'En az bir personel seçin.'],
  [{...f.input,waits:[{...f.input.waits[0],personIds:[]}]},'En az bir personel seçin.'],
 ] as const){const response=await call(f.object,'/api/workshop/operations','POST',input,f.session);expect(response.status).toBe(400);expect((await response.json() as {error:string}).error).toBe(message);}
 const data=await(await call(f.object,'/api/workshop','GET',undefined,f.session)).json() as WorkshopData;expect(data.operations).toHaveLength(0);
});
