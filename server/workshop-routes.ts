import { z } from 'zod';
import { isFrenPostasiJob } from '../shared/fren-postasi';
import { emptyWorkshop, type ActivityInput, type WorkshopActivity, type WorkshopData, type WorkshopOperation } from '../shared/workshop';
import type { RecordMetadata, Wagon } from '../shared/types';
import { assertActor, audit, type DatabaseEngine } from './database';
import type { SessionClaims } from './crypto';
import { ApiError } from './errors';
import { fieldSchemas, parseInput, validateWagonWorkflow } from './models';
import { activityInputSchema, dayInputSchema, operationInputSchema, personInputSchema, resolveStandardLines, shiftSchema, standardInputSchema } from './workshop';

const workEntryInput=z.object({wagonNumber:z.string().trim().min(1).max(200),startedAt:z.string().datetime({offset:true}),finishedAt:z.string().datetime({offset:true}),jobs:z.array(z.object({jobTypeId:z.number().int().positive(),quantity:z.number().int().positive().max(1000)}).strict()).min(1,'En az bir yapılan iş seçin.').max(100),notes:z.string().trim().max(1000)}).strict().refine(v=>Date.parse(v.finishedAt)>Date.parse(v.startedAt),'Bitiş zamanı başlangıçtan sonra olmalı.');
function workCatalog(data:WorkshopData,post:string){return data.standards.filter(s=>s.active&&isFrenPostasiJob(s.id)&&post==='Hava-Fren'&&!data.standards.some(other=>other.id===s.id&&other.validFrom>s.validFrom));}

function metadata(actorId:string,existing?:RecordMetadata):RecordMetadata { const now=new Date().toISOString();return {id:existing?.id??crypto.randomUUID(),revision:(existing?.revision??0)+1,createdAt:existing?.createdAt??now,updatedAt:now,updatedBy:actorId}; }
function existingRecord<T extends RecordMetadata>(rows:T[],id:string|undefined,revision:unknown):T|undefined {
 if(!id)return;
 const row=rows.find(r=>r.id===id);if(!row)throw new ApiError(404,'NOT_FOUND','Kayıt bulunamadı.');
 if(row.revision!==revision)throw new ApiError(409,'REVISION_CONFLICT','Kayıt değişmiş. Güncel kaydı yeniden açın.');return row;
}
function activePeople(data:WorkshopData,ids:string[],previous:string[]=[]){if(ids.some(id=>!previous.includes(id)&&!data.people.some(p=>p.id===id&&p.active)))throw new ApiError(400,'INACTIVE_PERSON','Yeni seçimlerde yalnız aktif personel kullanılabilir.');}
function createOperation(data:WorkshopData,input:z.infer<typeof operationInputSchema>,actorId:string,actorPost:string,existing?:WorkshopOperation):WorkshopOperation {
 if(actorPost!=='Hava-Fren'&&input.jobs.some(job=>isFrenPostasiJob(job.jobTypeId)))throw new ApiError(403,'POST_JOB_FORBIDDEN','Bu işler yalnız Hava-Fren postası için tanımlandı. Hesabım bölümünden postanızı kontrol edin.');
 activePeople(data,input.participation.flatMap(p=>p.personIds),existing?.participation.flatMap(p=>p.personIds));
 return {...input,...metadata(actorId,existing),formulaVersion:2,jobs:resolveStandardLines(input.jobs,data.standards,input.finishedAt,existing)};
}
const fullDaySchema=dayInputSchema.extend({fullNoWagon:z.boolean()});
export async function workshopRequest(engine:DatabaseEngine,claims:SessionClaims,path:string,method:string,raw?:Record<string,unknown>):Promise<Response> {
 const parts=path.slice('/api/workshop'.length).split('/').filter(Boolean),[resource,id]=parts;
 if(method==='GET'&&resource==='work-catalog'&&!id){const db=await engine.load(),actor=assertActor(db,claims);return Response.json({standards:workCatalog(db.workshop??emptyWorkshop(),actor.post??'')});}
 if(method==='GET'&&resource==='wagon-jobs'&&id){const db=await engine.load(),actor=assertActor(db,claims),admin=actor.role==='admin';const wagon=decodeURIComponent(id);return Response.json({operations:(db.workshop?.operations??[]).filter(o=>o.wagonNumber===wagon).map(o=>({id:o.id,startedAt:o.startedAt,finishedAt:o.finishedAt,jobs:o.jobs.map(j=>({name:j.name,quantity:j.quantity})),...(admin?{workers:[...new Set(o.participation.flatMap(p=>p.personIds))].map(personId=>db.workshop?.people.find(p=>p.id===personId)?.name??'Bilinmeyen personel')}: {})})),entries:(db.workEntries??[]).filter(e=>e.wagonNumber===wagon).map(e=>({id:e.id,startedAt:e.startedAt,finishedAt:e.finishedAt,jobs:e.jobs.map(j=>({name:j.name,quantity:j.quantity})),...(admin?{workers:[e.actorName]}:{})}))});}
 if(method==='GET'&&resource==='work-entries'&&!id){const db=await engine.load(),actor=assertActor(db,claims,true);return Response.json({entries:db.workEntries??[]});}
 if(method==='POST'&&resource==='work-entries'&&(!id||id==='with-wagon')){
  const parsed=id==='with-wagon'?parseInput(z.object({wagon:fieldSchemas.wagons,entry:workEntryInput}).strict(),raw):null;
  const input=parsed?.entry??parseInput(workEntryInput,raw);if(parsed){validateWagonWorkflow(parsed.wagon);if(parsed.wagon.number!==input.wagonNumber)throw new ApiError(400,'WAGON_MISMATCH','Vagon ve bakım numarası aynı olmalı.');}
  const {result,version}=await engine.mutate(db=>{const actor=assertActor(db,claims),data=db.workshop??=emptyWorkshop();
   if(!actor.post)throw new ApiError(400,'POST_REQUIRED','İş akışı girişi yapabilmek için Hesabım menüsünden Posta belirlemesi yapmanız gerekiyor!');
   if(!parsed&&!db.wagons.some(w=>w.number===input.wagonNumber))throw new ApiError(404,'WAGON_NOT_FOUND','Vagon kaydı bulunamadı.');
   if(parsed&&db.wagons.some(w=>w.number===parsed.wagon.number))throw new ApiError(409,'DUPLICATE_WAGON','Bu vagon numarası zaten kayıtlı.');
   const allowed=workCatalog(data,actor.post);const jobs=input.jobs.map(job=>{const standard=allowed.find(s=>s.id===job.jobTypeId);if(!standard)throw new ApiError(403,'POST_JOB_FORBIDDEN','Bu iş hesabınızın postası için tanımlı değil.');return{id:standard.id,name:standard.name,category:standard.category,quantity:job.quantity};});
   if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw new ApiError(400,'DUPLICATE_JOB','Aynı iş iki kez seçilemez.');
   const entry={id:crypto.randomUUID(),wagonNumber:input.wagonNumber,actorId:actor.id,actorName:actor.displayName,post:actor.post,startedAt:input.startedAt,finishedAt:input.finishedAt,jobs,notes:input.notes,createdAt:new Date().toISOString()};
   (db.workEntries??=[]).push(entry);if(parsed){const wagon={...parsed.wagon,...metadata(actor.id)} as Wagon;db.wagons.push(wagon);audit(db,actor,'Vagon eklendi','wagon',wagon.id);}
   audit(db,actor,'Yapılan işler kaydedildi','maintenance',entry.id);return entry;});return Response.json({record:result,version},{status:201});
 }
 if(method==='GET'&&!resource){const database=await engine.load();assertActor(database,claims,true);return Response.json({...(database.workshop??emptyWorkshop()),legacyOperations:database.maintenanceOperations??[],workEntries:database.workEntries??[],version:database.version});}
 if(method==='POST'&&resource==='operations'&&id==='with-wagon'){
  const input=parseInput(z.object({wagon:fieldSchemas.wagons,operation:operationInputSchema}).strict(),raw);validateWagonWorkflow(input.wagon);
  if(input.wagon.number!==input.operation.wagonNumber)throw new ApiError(400,'WAGON_MISMATCH','Vagon ve bakım numarası aynı olmalı.');
  const {result,version}=await engine.mutate(db=>{const actor=assertActor(db,claims,true),data=db.workshop??=emptyWorkshop();const operation=createOperation(data,input.operation,actor.id,actor.post??'');const wagon={...input.wagon,...metadata(actor.id)} as Wagon;
   data.operations.push(operation);db.wagons.push(wagon);audit(db,actor,'Vagon ve sürüm 2 bakım birlikte eklendi','wagon',wagon.id);audit(db,actor,'Bakım operasyonu eklendi (formül 2)','maintenance',operation.id);return {wagon,record:operation};});
  return Response.json({...result,version},{status:201});
 }
 if(resource==='shifts'&&method==='PUT'&&!id){const input=parseInput(z.object({shifts:z.array(shiftSchema).length(2)}).strict(),raw);
  const {version}=await engine.mutate(db=>{const actor=assertActor(db,claims,true);(db.workshop??=emptyWorkshop()).shifts=input.shifts;audit(db,actor,'Vardiya tanımları güncellendi','maintenance');});return Response.json({version});
 }
 if(resource==='standards'&&method==='POST'&&!id){const input=parseInput(standardInputSchema,raw);
  const {result,version}=await engine.mutate(db=>{const actor=assertActor(db,claims,true),data=db.workshop??=emptyWorkshop();const versions=data.standards.filter(s=>s.id===input.jobTypeId).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));const current=versions[0];
   if(!current||Date.parse(input.validFrom)<=Date.parse(current.validFrom))throw new ApiError(400,'STANDARD_DATE','Yeni standardın tarihi son sürümden sonra olmalı.');
   current.validUntil=input.validFrom;const {jobTypeId,...values}=input;const record={...values,id:jobTypeId,versionId:crypto.randomUUID(),validUntil:null};data.standards.push(record);audit(db,actor,'İş standardına tarihsel sürüm eklendi','maintenance',record.versionId);return record;});return Response.json({record:result,version},{status:201});
 }
 if(!['people','days','operations','activities'].includes(resource??'')||parts.length>2)throw new ApiError(404,'NOT_FOUND','Atölye işlemi bulunamadı.');
 if(!['POST','PATCH','DELETE'].includes(method)||(method==='POST'&&id)||(method!=='POST'&&!id))throw new ApiError(405,'METHOD_NOT_ALLOWED','İşlem desteklenmiyor.');
 const {revision,...input}=raw??{};
 if(method!=='POST')parseInput(z.number().int().positive(),revision);
 const {result,version}=await engine.mutate(db=>{
  const actor=assertActor(db,claims,true),data=db.workshop??=emptyWorkshop();
  const rows=data[resource as 'people'|'days'|'operations'|'activities'] as RecordMetadata[];
  const existing=existingRecord(rows,id,revision);
  if(method==='DELETE'){
   if(resource==='people')throw new ApiError(400,'PERSON_HISTORY','Personeli silmek yerine pasifleştirin.');
   if(resource==='days'&&(data.operations.some(o=>o.participation.some(p=>p.dayId===id))||data.activities.some(a=>a.dayId===id)))throw new ApiError(409,'REFERENCED_DAY','Önce bu vardiyaya bağlı bakım ve faaliyet kayıtlarını kaldırın.');
   if(resource==='operations'&&data.activities.some(a=>a.operationId===id))throw new ApiError(409,'REFERENCED_ORDER','Önce iş emrine bağlı yardımcı faaliyetleri kaldırın.');
   rows.splice(rows.indexOf(existing!),1);audit(db,actor,`Atölye kaydı silindi (${resource})`,'maintenance',id);return null;
  }
  let record:RecordMetadata;
  if(resource==='people'){
   const values=parseInput(personInputSchema,input);
   if(data.people.some(p=>p.id!==id&&p.name.toLocaleLowerCase('tr-TR')===values.name.toLocaleLowerCase('tr-TR')))throw new ApiError(400,'DUPLICATE_PERSON','Bu personel adı zaten var. Ayırt edici bir ad kullanın.');
   record={...values,...metadata(actor.id,existing)};
  }else if(resource==='days'){
   const {fullNoWagon,...values}=parseInput(fullDaySchema,input),old=existing as WorkshopData['days'][number]|undefined;
   activePeople(data,values.attendance.map(a=>a.personId),old?.attendance.map(a=>a.personId));
   const shift=data.shifts.find(s=>s.id===values.shiftId);if(!shift)throw new ApiError(400,'SHIFT_REQUIRED','Vardiya bulunamadı.');
   const day={...values,shiftName:old?.shiftName??shift.name,...metadata(actor.id,existing)};record=day;
   data.activities=data.activities.filter(a=>!a.id.startsWith(`${day.id}:full:`));
   if(fullNoWagon){if(day.wagonAvailable)throw new ApiError(400,'NO_WAGON_STATUS','Tam vagonsuzluk için vagon yok seçilmeli.');
    for(const a of day.attendance){const activity:WorkshopActivity={...metadata(actor.id),id:`${day.id}:full:${a.personId}`,dayId:day.id,operationId:null,startedAt:a.startedAt,finishedAt:a.finishedAt,personIds:[a.personId],kind:'no-wagon',reason:day.noWagonReason,notes:'Günlük durumdan oluşturulan tam vardiya kaybı.'};data.activities.push(activity);}
   }
  }else if(resource==='operations')record=createOperation(data,parseInput(operationInputSchema,input),actor.id,actor.post??'',existing as WorkshopOperation|undefined);
  else {const values:ActivityInput=parseInput(activityInputSchema,input);activePeople(data,values.personIds,(existing as WorkshopActivity|undefined)?.personIds);record={...values,...metadata(actor.id,existing)};}
  // A daily save can replace auto-created loss activities. Read the destination
  // after that replacement so an array reference cannot silently lose updates.
  const destination=data[resource as 'people'|'days'|'operations'|'activities'] as RecordMetadata[];
  if(existing)destination[destination.indexOf(existing)]=record;else destination.push(record);
  audit(db,actor,`Atölye kaydı ${existing?'düzenlendi':'eklendi'} (${resource})`,'maintenance',record.id);return record;
 });
 return Response.json({record:result,version},{status:method==='POST'?201:200});
}
