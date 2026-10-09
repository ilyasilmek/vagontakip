import { JOB_TYPES, type JobType, type WorkItem } from './maintenance';
import { ensureFrenPostasiStandards } from './fren-postasi';
import type { RecordMetadata } from './types';

export const FORMULA_VERSION = 2 as const;
export interface Interval { startedAt: string; finishedAt: string; }
export interface PeopleInterval extends Interval { personIds: string[]; }
export interface Person extends RecordMetadata { name: string; active: boolean; }
export interface ShiftDefinition { id: string; name: string; start: string; end: string; breakStart: string; breakEnd: string; }
export const DEFAULT_SHIFTS: ShiftDefinition[] = [
 { id:'1',name:'1. Vardiya',start:'08:00',end:'16:00',breakStart:'12:00',breakEnd:'12:30' },
 { id:'2',name:'2. Vardiya',start:'13:30',end:'21:30',breakStart:'17:00',breakEnd:'17:30' },
];
export interface Attendance extends Interval { personId: string; }
export interface WorkshopDay extends RecordMetadata, Interval {
 date: string; shiftId: string; shiftName: string; breaks: Interval[]; attendance: Attendance[];
 wagonAvailable: boolean; noWagonReason: string; notes: string;
}
export const ACTIVITY_KINDS = ['no-wagon','preparation','cleaning','auxiliary','other'] as const;
export type ActivityKind = typeof ACTIVITY_KINDS[number];
export const ACTIVITY_LABELS: Record<ActivityKind,string> = {'no-wagon':'Vagonsuzluk','preparation':'Hazırlık ve güvenlik','cleaning':'Temizlik ve 5S','auxiliary':'Yardımcı faaliyet','other':'Diğer faaliyet'};
export interface WorkshopActivity extends RecordMetadata, PeopleInterval { dayId: string; operationId: string|null; kind: ActivityKind; reason: string; notes: string; }
export interface Participation extends PeopleInterval { dayId: string; }
export interface WorkshopWait extends PeopleInterval { reason: string; note: string; }
export interface Standard extends JobType { versionId: string; validFrom: string; validUntil: string|null; active: boolean; }
export interface StandardLine extends WorkItem { versionId: string; }
export interface WorkshopOperation extends RecordMetadata, Interval {
 formulaVersion: 2; wagonNumber: string; supervisor: string; notes: string; jobs: StandardLine[];
 participation: Participation[]; waits: WorkshopWait[];
}
export interface WorkshopData { formulaVersion: 2; people: Person[]; shifts: ShiftDefinition[]; standards: Standard[]; days: WorkshopDay[]; operations: WorkshopOperation[]; activities: WorkshopActivity[]; }
export type OperationInput = Omit<WorkshopOperation,keyof RecordMetadata|'jobs'|'formulaVersion'> & { jobs: {jobTypeId:number;quantity:number}[]; };
export type DayInput = Omit<WorkshopDay,keyof RecordMetadata|'shiftName'>;
export type ActivityInput = Omit<WorkshopActivity,keyof RecordMetadata>;
export function emptyWorkshop(): WorkshopData {
 const standards:Standard[]=JOB_TYPES.map(j=>({...j,versionId:`initial-${j.id}`,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null,active:true}));
 ensureFrenPostasiStandards(standards);
 return {formulaVersion:2,people:[],shifts:structuredClone(DEFAULT_SHIFTS),standards,days:[],operations:[],activities:[]};
}
export function turkeyTime(date:string,clock:string):string { return new Date(`${date}T${clock}:00+03:00`).toISOString(); }
export function turkeyDate(iso:string):string { return new Date(Date.parse(iso)+3*3600000).toISOString().slice(0,10); }
export function localTime(iso:string):string { return new Date(Date.parse(iso)+3*3600000).toISOString().slice(0,16); }
export function fromLocal(value:string):string { return new Date(value+':00+03:00').toISOString(); }
export function milliseconds(i:Interval):[number,number] { return [Date.parse(i.startedAt),Date.parse(i.finishedAt)]; }
export function intersects(a:Interval,b:Interval):boolean { const [as,ae]=milliseconds(a),[bs,be]=milliseconds(b);return as<be&&bs<ae; }
export function intersection(a:Interval,b:Interval):Interval|null {
 const [as,ae]=milliseconds(a),[bs,be]=milliseconds(b),s=Math.max(as,bs),e=Math.min(ae,be);
 return s<e?{startedAt:new Date(s).toISOString(),finishedAt:new Date(e).toISOString()}:null;
}
export function subtract(interval:Interval,cuts:Interval[]):Interval[] {
 let result=[interval];
 for(const cut of cuts){const [cs,ce]=milliseconds(cut);result=result.flatMap(i=>{const [s,e]=milliseconds(i);if(cs>=e||ce<=s)return[i];const parts:Interval[]=[];if(s<cs)parts.push({startedAt:i.startedAt,finishedAt:new Date(cs).toISOString()});if(ce<e)parts.push({startedAt:new Date(ce).toISOString(),finishedAt:i.finishedAt});return parts;});}
 return result;
}
export function minutes(interval:Interval):number { const [s,e]=milliseconds(interval);return(e-s)/60000; }
export function netMilliseconds(interval:Interval,breaks:Interval[],range?:Interval):number {
 const selected=range?intersection(interval,range):interval;if(!selected)return 0;
 return subtract(selected,breaks).reduce((n,i)=>n+Date.parse(i.finishedAt)-Date.parse(i.startedAt),0);
}
export function netMinutes(interval:Interval,breaks:Interval[],range?:Interval):number { return netMilliseconds(interval,breaks,range)/60000; }
export function unionMinutes(intervals:Interval[]):number {
 const rows=intervals.map(milliseconds).sort((a,b)=>a[0]-b[0]);let result=0,start=0,end=0;
 for(const [s,e]of rows){if(s>end){result+=end-start;start=s;end=e;}else end=Math.max(end,e);}return(result+end-start)/60000;
}
export function ratio(value:number,denominator:number):number|null { return denominator>0?value/denominator*100:null; }
export function calculateOperation(operation:WorkshopOperation,days:WorkshopDay[],range?:Interval) {
 const dayMap=new Map(days.map(d=>[d.id,d]));
 const actualMilliseconds=operation.participation.reduce((n,p)=>n+netMilliseconds(p,dayMap.get(p.dayId)?.breaks??[],range)*p.personIds.length,0);
 const waitPieces:Interval[]=[];let waitingMilliseconds=0;
 for(const wait of operation.waits)for(const personId of wait.personIds)for(const p of operation.participation.filter(p=>p.personIds.includes(personId))){
  let overlap=intersection(wait,p);if(overlap&&range)overlap=intersection(overlap,range);if(!overlap)continue;
  const pieces=subtract(overlap,dayMap.get(p.dayId)?.breaks??[]);waitPieces.push(...pieces);waitingMilliseconds+=pieces.reduce((n,i)=>n+netMilliseconds(i,[]),0);
 }
 const completion=Date.parse(operation.finishedAt),inRange=!range||(completion>=Date.parse(range.startedAt)&&completion<Date.parse(range.finishedAt));
 const standardMinutes=operation.jobs.reduce((n,j)=>n+j.quantity*j.standardMinutes,0);
 const workload=inRange?standardMinutes/60:0,actualLabor=actualMilliseconds/3600000,waitingLabor=waitingMilliseconds/3600000,workingLabor=(actualMilliseconds-waitingMilliseconds)/3600000;
 const personnel=new Set(operation.participation.flatMap(p=>p.personIds)).size;
 const hasUntimedJobs=operation.jobs.some(job=>job.standardMinutes===0);
 const stableCrew=operation.participation.every(p=>p.personIds.length===personnel);
 return {workload,standardMinutes,elapsedMinutes:minutes(operation),actualLabor,waitingLabor,workingLabor,waitingMinutes:unionMinutes(waitPieces),personnel,
  estimatedMinutes:!hasUntimedJobs&&stableCrew&&personnel>0?standardMinutes/personnel:null,netEfficiency:hasUntimedJobs?null:ratio(workload,workingLabor),grossEfficiency:hasUntimedJobs?null:ratio(workload,actualLabor)};
}
export interface LedgerEntry extends Interval { personId:string; kind:'maintenance'|'waiting'|ActivityKind; sourceId:string; dayId:string; }
export function ledger(data:WorkshopData):LedgerEntry[] {
 const days=new Map(data.days.map(d=>[d.id,d]));const entries:LedgerEntry[]=[];
 for(const operation of data.operations)for(const p of operation.participation)for(const personId of p.personIds){
  const breaks=days.get(p.dayId)?.breaks??[];
  const waits=operation.waits.filter(w=>w.personIds.includes(personId)).map(w=>intersection(w,p)).filter((w):w is Interval=>!!w);
  for(const work of subtract(p,[...breaks,...waits]))entries.push({...work,personId,kind:'maintenance',sourceId:operation.id,dayId:p.dayId});
  for(const wait of waits)for(const piece of subtract(wait,breaks))entries.push({...piece,personId,kind:'waiting',sourceId:operation.id,dayId:p.dayId});
 }
 for(const a of data.activities)for(const personId of a.personIds)for(const piece of subtract(a,days.get(a.dayId)?.breaks??[]))entries.push({...piece,personId,kind:a.kind,sourceId:a.id,dayId:a.dayId});
 return entries;
}
export function summarizeWorkshop(data:WorkshopData,range:Interval) {
 const capacity=data.days.reduce((n,d)=>n+d.attendance.reduce((sum,a)=>sum+netMilliseconds(a,d.breaks,range),0),0)/3600000;
 const ops=data.operations.map(o=>({operation:o,values:calculateOperation(o,data.days,range)}));
 const sum=(key:'workload'|'actualLabor'|'waitingLabor'|'workingLabor')=>ops.reduce((n,v)=>n+v.values[key],0);
 const hasUntimedCompleted=data.operations.some(o=>o.jobs.some(j=>j.standardMinutes===0)&&Date.parse(o.finishedAt)>=Date.parse(range.startedAt)&&Date.parse(o.finishedAt)<Date.parse(range.finishedAt));
 const workload=sum('workload'),actualLabor=sum('actualLabor'),waitingLabor=sum('waitingLabor'),workingLabor=sum('workingLabor');
 const events=ledger(data);const categories=Object.fromEntries(['maintenance','waiting',...ACTIVITY_KINDS].map(kind=>[kind,events.filter(e=>e.kind===kind).reduce((n,e)=>n+netMilliseconds(e,[],range),0)/3600000])) as Record<LedgerEntry['kind'],number>;
 const used=Object.values(categories).reduce((a,b)=>a+b,0),unexplained=capacity-used;
 const fullNoWagonDays=new Set(data.days.filter(d=>intersection(d,range)&&d.attendance.length&&d.attendance.every(a=>{
  const loss=events.filter(e=>e.dayId===d.id&&e.personId===a.personId&&e.kind==='no-wagon').reduce((n,e)=>n+netMinutes(e,[]),0);
  return Math.abs(loss-netMinutes(a,d.breaks))<1e-7;
 })).map(d=>d.date)).size;
 const reasons:Record<string,number>={};for(const a of data.activities.filter(a=>a.kind==='no-wagon')){const value=netMinutes(a,data.days.find(d=>d.id===a.dayId)?.breaks??[],range)*a.personIds.length/60;if(value>0)reasons[a.reason]=(reasons[a.reason]??0)+value;}
 const performances:Record<string,{workload:number;actualLabor:number;waitingLabor:number;completedActualLabor:number;completedWorkingLabor:number}>={};
 let completedActualLabor=0,completedWorkingLabor=0;
 for(const {operation:o,values:v}of ops){if(v.workload||v.actualLabor){const p=performances[o.wagonNumber]??={workload:0,actualLabor:0,waitingLabor:0,completedActualLabor:0,completedWorkingLabor:0};p.workload+=v.workload;p.actualLabor+=v.actualLabor;p.waitingLabor+=v.waitingLabor;
  if(Date.parse(o.finishedAt)>=Date.parse(range.startedAt)&&Date.parse(o.finishedAt)<Date.parse(range.finishedAt)){const full=calculateOperation(o,data.days);completedActualLabor+=full.actualLabor;completedWorkingLabor+=full.workingLabor;p.completedActualLabor+=full.actualLabor;p.completedWorkingLabor+=full.workingLabor;}
 }}
 const jobTypes:Record<string,{quantity:number;workload:number}>={};for(const {operation:o,values:v}of ops)if(v.workload)for(const j of o.jobs){const value=jobTypes[j.name]??={quantity:0,workload:0};value.quantity+=j.quantity;value.workload+=j.quantity*j.standardMinutes/60;}
 return {capacity,workload,actualLabor,waitingLabor,workingLabor,noWagonLabor:categories['no-wagon'],auxiliaryLabor:categories.preparation+categories.cleaning+categories.auxiliary+categories.other,
  unexplained:capacity>0?unexplained:null,categories,fullNoWagonDays,reasons,performances,jobTypes,
  capacityUse:ratio(workload,capacity),noWagonRate:ratio(categories['no-wagon'],capacity),waitingRate:ratio(waitingLabor,capacity),netEfficiency:hasUntimedCompleted?null:ratio(workload,completedWorkingLabor),grossEfficiency:hasUntimedCompleted?null:ratio(workload,completedActualLabor),
  operationCount:ops.filter(o=>o.values.workload||o.values.actualLabor).length,
  warning:hasUntimedCompleted?'Bazı işlerin standart süresi tanımlı değil; iş yükü eksik ve verimlilik hesaplanamaz.':capacity===0?'Planlı vardiya kaydı yok veya kapasite sıfır; oranlar hesaplanamadı.':Math.abs(unexplained)>1e-7?unexplained<0?'Negatif kapasite bakiyesi: kayıtları kontrol edin.':'Açıklanamayan kapasite var; personelin faaliyet kayıtlarını tamamlayın.':null};
}
