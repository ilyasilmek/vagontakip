import { z } from 'zod';
import { ACTIVITY_KINDS, ACTIVITY_LABELS, ledger, milliseconds, minutes, netMinutes, subtract, turkeyDate, type LedgerEntry, type WorkshopData, type WorkshopOperation, type Standard } from '../shared/workshop';
import { ApiError } from './errors';

const id=z.string().min(1).max(100),text=z.string().trim().max(1000),instant=z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString());
const interval={startedAt:instant,finishedAt:instant};
const people=z.array(id).min(1,'En az bir personel seçin.').max(100).refine(ids=>new Set(ids).size===ids.length,'Aynı kişi birden fazla seçilemez.');
const meta={id,revision:z.number().int().positive(),createdAt:instant,updatedAt:instant,updatedBy:id};
export const personInputSchema=z.object({name:z.string().trim().min(1).max(100),active:z.boolean()}).strict();
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const shiftSchema=z.object({id:z.enum(['1','2']),name:z.string().min(1).max(100),start:clock,end:clock,breakStart:clock,breakEnd:clock}).strict().refine(s=>s.start<s.end&&s.start<=s.breakStart&&s.breakStart<s.breakEnd&&s.breakEnd<=s.end&&!(s.start===s.breakStart&&s.end===s.breakEnd),'Vardiya ve mola saatlerini kontrol edin.');
export const dayInputSchema=z.object({...interval,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),shiftId:z.enum(['1','2']),breaks:z.array(z.object(interval).strict()).max(10),attendance:z.array(z.object({...interval,personId:id}).strict()).max(100),wagonAvailable:z.boolean(),noWagonReason:text,notes:text}).strict();
export const participationSchema=z.object({...interval,dayId:id,personIds:people}).strict();
export const waitSchema=z.object({...interval,personIds:people,reason:z.string().trim().min(1).max(200),note:text}).strict();
export const operationInputSchema=z.object({...interval,wagonNumber:z.string().trim().min(1).max(200),supervisor:z.string().trim().min(1).max(100),notes:text,
 participation:z.array(participationSchema).min(1,'En az bir personel / vardiya katılımı ekleyin.').max(100),waits:z.array(waitSchema).max(50),jobs:z.array(z.object({jobTypeId:z.number().int().positive(),quantity:z.number().int().positive().max(1000)}).strict()).min(1,'En az bir yapılan iş seçin.').max(100)}).strict();
export const activityInputSchema=z.object({...interval,dayId:id,operationId:id.nullable(),personIds:people,kind:z.enum(ACTIVITY_KINDS),reason:text,notes:text}).strict();
export const standardInputSchema=z.object({jobTypeId:z.number().int().positive(),name:z.string().trim().min(1).max(200),category:z.string().trim().min(1).max(100),standardMinutes:z.number().nonnegative().max(10000),active:z.boolean(),validFrom:instant}).strict();
const lineSchema=z.object({id:z.number().int().positive(),versionId:id,name:z.string().min(1),category:z.string().min(1),standardMinutes:z.number().nonnegative(),quantity:z.number().int().positive()});
export const workshopSchema=z.object({formulaVersion:z.literal(2),people:z.array(personInputSchema.extend(meta)),shifts:z.array(shiftSchema),
 standards:z.array(z.object({id:z.number().int().positive(),versionId:id,name:z.string().min(1),category:z.string().min(1),standardMinutes:z.number().nonnegative(),active:z.boolean(),validFrom:instant,validUntil:instant.nullable()})),
 days:z.array(dayInputSchema.extend({...meta,shiftName:z.string().min(1)})),
 operations:z.array(operationInputSchema.omit({jobs:true}).extend({...meta,formulaVersion:z.literal(2),jobs:z.array(lineSchema).min(1,'En az bir yapılan iş seçin.')})),
 activities:z.array(activityInputSchema.extend(meta))});
function requireRule(ok:boolean,message:string):asserts ok { if(!ok)throw new ApiError(400,'WORKSHOP_VALIDATION',message); }
function validInterval(i:{startedAt:string;finishedAt:string}) { requireRule(milliseconds(i).every(Number.isFinite)&&minutes(i)>0,'Bitiş zamanı başlangıçtan sonra olmalı.'); }
function unique<T>(rows:T[],key:(row:T)=>string,label:string){requireRule(new Set(rows.map(key)).size===rows.length,`${label}: mükerrer kayıt var.`);}
function covered(i:{startedAt:string;finishedAt:string},parts:{startedAt:string;finishedAt:string}[]){return subtract(i,parts).length===0;}
function conflict(rows:{personId:string;startedAt:string;finishedAt:string}[],label:string){
 const grouped=new Map<string,typeof rows>();for(const row of rows){const values=grouped.get(row.personId)??[];values.push(row);grouped.set(row.personId,values);}
 for(const entries of grouped.values()){entries.sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt));let end=-Infinity;for(const row of entries){requireRule(Date.parse(row.startedAt)>=end,label);end=Math.max(end,Date.parse(row.finishedAt));}}
}
const conflictTime=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'});
function ledgerConflict(data:WorkshopData):{message:string;operationIds:string[]}|null {
 const grouped=new Map<string,LedgerEntry[]>();
 for(const entry of ledger(data)){const rows=grouped.get(entry.personId)??[];rows.push(entry);grouped.set(entry.personId,rows);}
 const overlaps:{personId:string;first:LedgerEntry;second:LedgerEntry;startedAt:string;finishedAt:string}[]=[];
 for(const [personId,rows] of grouped){
  rows.sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length&&rows[j].startedAt<rows[i].finishedAt;j++){
   overlaps.push({personId,first:rows[i],second:rows[j],startedAt:rows[j].startedAt,finishedAt:rows[i].finishedAt<rows[j].finishedAt?rows[i].finishedAt:rows[j].finishedAt});
  }
 }
 if(!overlaps.length)return null;
 const selected=overlaps[0];
 const sameSource=(entry:LedgerEntry,other:LedgerEntry)=>entry.kind===other.kind&&entry.sourceId===other.sourceId;
 const related=overlaps.filter(row=>(sameSource(row.first,selected.first)&&sameSource(row.second,selected.second))||(sameSource(row.first,selected.second)&&sameSource(row.second,selected.first)));
 const names=[...new Set(related.map(row=>data.people.find(person=>person.id===row.personId)?.name??'Bilinmeyen personel'))];
 const describe=(entry:LedgerEntry)=>{
  if(entry.kind==='maintenance'||entry.kind==='waiting'){
   const wagon=data.operations.find(operation=>operation.id===entry.sourceId)?.wagonNumber??'bilinmeyen';
   return `${wagon} numaralı vagonun ${entry.kind==='maintenance'?'bakımı':'bakım içi beklemesi'}`;
  }
  return `${ACTIVITY_LABELS[entry.kind]} kaydı`;
 };
 const peopleText=names.slice(0,5).join(', ')+(names.length>5?` ve ${names.length-5} kişi daha`:'');
 const timeText=`${conflictTime.format(new Date(selected.startedAt))} – ${conflictTime.format(new Date(selected.finishedAt))}`;
 const operationIds=[selected.first,selected.second].filter(entry=>entry.kind==='maintenance'||entry.kind==='waiting').map(entry=>entry.sourceId);
 return {message:`${peopleText}: ${timeText} aralığında ${describe(selected.first)} ile ${describe(selected.second)} çakışıyor. Önce ilgili kayıtların gerçek bitiş saatlerini doğrulayın; ardından personel veya saat aralığını düzeltin.${overlaps.length>related.length?' Başka çakışmalar da olabilir.':''}`,operationIds:[...new Set(operationIds)]};
}
export function validateWorkshop(data:WorkshopData):void {
 const parsed=workshopSchema.safeParse(data);requireRule(parsed.success,parsed.success?'':parsed.error.issues[0]?.message??'Atölye kayıtları geçersiz.');
 const people=new Set(data.people.map(p=>p.id)),days=new Map(data.days.map(d=>[d.id,d]));
 for(const rows of [data.people,data.days,data.operations,data.activities])unique(rows as {id:string}[],r=>r.id,'Kimlik');
 unique(data.shifts,s=>s.id,'Vardiya');unique(data.standards,s=>s.versionId,'Standart sürümü');unique(data.days,d=>`${d.date}:${d.shiftId}`,'Tarih ve vardiya');
 const schedule:{personId:string;startedAt:string;finishedAt:string}[]=[];
 for(const day of data.days){
  validInterval(day);requireRule(turkeyDate(day.startedAt)===day.date&&turkeyDate(day.finishedAt)===day.date,'Günlük kayıt saatleri seçilen tarihte olmalı.');
  requireRule(data.shifts.some(s=>s.id===day.shiftId),'Vardiya bulunamadı.');requireRule(day.wagonAvailable||!!day.noWagonReason,'Vagon yoksa vagonsuzluk nedeni girilmeli.');
  for(const b of day.breaks){validInterval(b);requireRule(covered(b,[day]),'Mola vardiyanın içinde olmalı.');}
  conflict(day.breaks.map(b=>({...b,personId:'break'})),'Mola aralıkları çakışamaz.');
  requireRule(netMinutes(day,day.breaks)>0,'Net vardiya süresi sıfırdan büyük olmalı.');
  unique(day.attendance,a=>a.personId,'Vardiya personeli');
  for(const a of day.attendance){validInterval(a);requireRule(people.has(a.personId),'Personel bulunamadı.');requireRule(covered(a,[day]),'Personel vardiya dışında planlanamaz.');requireRule(netMinutes(a,day.breaks)>0,'Personelin net planlı süresi sıfır olamaz.');schedule.push(...subtract(a,day.breaks).map(i=>({...i,personId:a.personId})));}
 }
 conflict(schedule,'Aynı personel çakışan vardiyalarda iki kez planlanamaz.');
 for(const standard of data.standards){if(standard.validUntil)requireRule(Date.parse(standard.validUntil)>Date.parse(standard.validFrom),'Standart geçerlilik tarihleri hatalı.');}
 for(const operation of data.operations){
  validInterval(operation);unique(operation.jobs,j=>String(j.id),'İş kalemi');
  for(const j of operation.jobs)requireRule(data.standards.some(s=>s.versionId===j.versionId&&s.id===j.id),'İş standardı sürümü bulunamadı.');
  const assignments:{personId:string;startedAt:string;finishedAt:string}[]=[];
  for(const p of operation.participation){validInterval(p);requireRule(covered(p,[operation]),'Personel katılımı iş emrinin içinde olmalı.');const day=days.get(p.dayId);requireRule(!!day,'Günlük vardiya kaydı bulunamadı.');requireRule(day.wagonAvailable,'Vagonsuz vardiyaya bakım kaydı yazılamaz; günlük durumu kontrol edin.');
   for(const personId of p.personIds){requireRule(people.has(personId),'Personel bulunamadı.');requireRule(covered(p,day.attendance.filter(a=>a.personId===personId)),'Bakım personeli ilgili saatlerde vardiyada planlı olmalı.');assignments.push(...subtract(p,day.breaks).map(i=>({...i,personId})));}
  }
  conflict(assignments,'İş emrinde aynı kişinin katılım aralıkları çakışamaz.');
  const waits:{personId:string;startedAt:string;finishedAt:string}[]=[];
  for(const w of operation.waits){validInterval(w);requireRule(covered(w,[operation]),'Bekleme iş emrinin içinde olmalı.');
   for(const personId of w.personIds){const parts=operation.participation.filter(p=>p.personIds.includes(personId));requireRule(covered(w,parts),'Bekleyen kişi o saatlerde bu iş emrine atanmış olmalı.');
    const breaks=parts.flatMap(p=>days.get(p.dayId)!.breaks);const pieces=subtract(w,breaks);requireRule(pieces.length>0,'Yemek molası bekleme kaybı sayılamaz.');waits.push(...pieces.map(i=>({...i,personId})));}
  }
  conflict(waits,'Aynı kişinin bekleme aralıkları çakışamaz.');
 }
 for(const a of data.activities){validInterval(a);const day=days.get(a.dayId);requireRule(!!day,'Günlük vardiya kaydı bulunamadı.');requireRule(netMinutes(a,day.breaks)>0,'Faaliyet yalnız yemek molasına yazılamaz.');
  if(a.operationId)requireRule(data.operations.some(o=>o.id===a.operationId),'Bağlı iş emri bulunamadı.');
  if(a.kind==='no-wagon')requireRule(!!a.reason,'Vagonsuzluk nedeni girilmeli.');
  for(const personId of a.personIds){requireRule(people.has(personId),'Personel bulunamadı.');requireRule(covered(a,day.attendance.filter(p=>p.personId===personId)),'Faaliyet personeli ilgili saatlerde vardiyada planlı olmalı.');}
 }
 const overlap=ledgerConflict(data);if(overlap)throw new ApiError(400,'WORKSHOP_TIME_CONFLICT',overlap.message,{operationIds:overlap.operationIds});
}
export function resolveStandardLines(input:{jobTypeId:number;quantity:number}[],standards:Standard[],at:string,existing?:WorkshopOperation) {
 return input.map(j=>{
  const old=existing?.jobs.find(line=>line.id===j.jobTypeId);if(old)return{...old,quantity:j.quantity};
  const candidates=standards.filter(s=>s.id===j.jobTypeId&&Date.parse(s.validFrom)<=Date.parse(at)&&(!s.validUntil||Date.parse(s.validUntil)>Date.parse(at))).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
  const s=candidates[0];requireRule(!!s&&s.active,'İş kalemi bu tarihte aktif değil veya standardı bulunamadı.');
  return{id:s.id,versionId:s.versionId,name:s.name,category:s.category,standardMinutes:s.standardMinutes,quantity:j.quantity};
 });
}
