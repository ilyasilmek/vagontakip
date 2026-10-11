import type { RecordMetadata } from './types';
import type { BrakeMode } from './fren-postasi';

export interface JobType { id: number; name: string; standardMinutes: number; category: string; }
const rows: [string, number, string][] = [
 ['Sabo sök-tak (1 adet)',5,'Fren & Mekanik'],['Triblvalf sökme',10,'Valf & Sistem'],['Triblvalf takma',10,'Valf & Sistem'],
 ['Yön sensörü sökme (1 adet)',15,'Sensör & Elektrik'],['Yön sensörü takma (1 adet)',15,'Sensör & Elektrik'],['Yük sensörü sökme (1 adet)',40,'Sensör & Elektrik'],['Yük sensörü takma (1 adet)',40,'Sensör & Elektrik'],
 ['Regülatör sökme',60,'Fren & Mekanik'],['Regülatör takma',60,'Fren & Mekanik'],['Regülatör delik ayarı',60,'Ayar & Kalibrasyon'],['Regülatör cırcır ayarı',20,'Ayar & Kalibrasyon'],['Regülatör bağlantı pernosu sök-tak',20,'Fren & Mekanik'],['Fren üçgeni arızası',50,'Fren & Mekanik'],
 ['Emniyet çemberi eksik vida (1 adet)',5,'Gövde & Şasi'],['Emniyet çemberi düzeltme sök-tak',30,'Gövde & Şasi'],['Sensör hortumu arızası sök-tak',20,'Sensör & Elektrik'],['Sensör hortumu conta eksiği',10,'Sensör & Elektrik'],['Sensör fren bağlantısı sök-tak',10,'Sensör & Elektrik'],['Orta fren manivela tertibatı kontrolü',2,'Kontrol & Test'],
 ['Tringale sökmek',80,'Fren & Mekanik'],['Tringale takmak',80,'Fren & Mekanik'],['Çarık sökmek',25,'Fren & Mekanik'],['Çarık takmak',10,'Fren & Mekanik'],['Tringale çarık set',90,'Fren & Mekanik'],['Yardımcı hava depo kontrolü',10,'Kontrol & Test'],['Fren silindir kontrolü',15,'Kontrol & Test'],['Ana hava (Kondüvit) borusu kontrolü',10,'Kontrol & Test'],['Akerman-Hortum kontrolü',5,'Kontrol & Test'],
 ['Akerman tepe contası',5,'Akerman & Tesisat'],['Akerman ağız contası',5,'Akerman & Tesisat'],['Akerman göbek contası',10,'Akerman & Tesisat'],['Akerman sök-tak',15,'Akerman & Tesisat'],['Toz çantası kontrolü ve temizliği',20,'Temizlik & Bakım'],['Fren iptal kolu sök-tak',45,'Fren & Mekanik'],['Fren ayar kolları ve levhaları kontrolü',5,'Kontrol & Test'],['Fren pabucu ve askı tertibatı kontrolü',5,'Kontrol & Test'],['El fren tertibatı kontrolü',5,'Kontrol & Test'],['El fren tertibatı tamiri',30,'Fren & Mekanik'],['Hava boşaltma (Pürjör) kolu kontrolü',10,'Kontrol & Test'],['Akerman hortumu sök-tak',10,'Akerman & Tesisat'],['Sızdırmazlık testi',10,'Kontrol & Test'],['Fren tecrübesi kontrolü',10,'Kontrol & Test'],
 ['Yük-Yolcu kolu sök-tak',30,'Mekanik & Aksam'],['Dolu boş kolu sök-tak',30,'Mekanik & Aksam'],['Dolu boş mekanizma tamiri',30,'Mekanik & Aksam'],['Hareketli kol levha sök-tak',30,'Mekanik & Aksam'],['El freni gidonu sök-tak',20,'Mekanik & Aksam'],['Ağır bakım & Yürüyüş',180,'Ağır Bakım'],['Hazırlık & Güvenlik',5,'Genel İşlemler'],
];
export const JOB_TYPES: JobType[] = rows.map(([name,standardMinutes,category],i)=>({id:i+1,name,standardMinutes,category}));
export const WAIT_REASONS = ['Manevra Bekleme','Malzeme/Valf Tedarik','Kanal/Test Yolu İşgali','Diğer'] as const;
export interface WorkItem extends JobType { quantity: number; brakeMode?: BrakeMode; durationMinutes?: number; durationSeconds?: number; loadDurationSeconds?:number; passengerDurationSeconds?:number; }
export interface WaitEntry { reason: typeof WAIT_REASONS[number]; minutes: number; note: string; }
export interface MaintenanceOperation extends RecordMetadata {
 wagonNumber: string; startedAt: string; finishedAt: string; shift: string; supervisor: string; personnel: number;
 jobs: WorkItem[]; waits: WaitEntry[]; notes: string;
}
export interface MaintenanceInput extends Omit<MaintenanceOperation,keyof RecordMetadata|'jobs'> { jobs: {jobTypeId:number;quantity:number}[]; }
export function calculateMaintenance(operation: Pick<MaintenanceOperation,'jobs'|'waits'|'personnel'|'startedAt'|'finishedAt'>) {
 const standardMinutes=operation.jobs.reduce((sum,job)=>sum+job.standardMinutes*job.quantity,0);
 const elapsedMinutes=(Date.parse(operation.finishedAt)-Date.parse(operation.startedAt))/60000;
 const waitingMinutes=operation.waits.reduce((sum,wait)=>sum+wait.minutes,0);
 const workload=standardMinutes/60;
 const actualLabor=elapsedMinutes*operation.personnel/60;
 const waitingLabor=waitingMinutes*operation.personnel/60;
 const workingLabor=(elapsedMinutes-waitingMinutes)*operation.personnel/60;
 return {workload,elapsedMinutes,waitingMinutes,actualLabor,waitingLabor,workingLabor,estimatedMinutes:standardMinutes/operation.personnel,
  netEfficiency:workingLabor>0?workload/workingLabor*100:null,grossEfficiency:actualLabor>0?workload/actualLabor*100:null};
}
export function operationMonth(startedAt: string): string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).formatToParts(new Date(startedAt));
 return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;
}
export function summarizeMaintenance(operations: MaintenanceOperation[]) {
 const values=operations.map(calculateMaintenance);
 const sum=(key:'workload'|'actualLabor'|'waitingLabor'|'workingLabor')=>values.reduce((n,v)=>n+v[key],0);
 const workload=sum('workload'), actualLabor=sum('actualLabor'), workingLabor=sum('workingLabor'),waitingLabor=sum('waitingLabor');
 return {count:operations.length,wagonCount:new Set(operations.map(o=>o.wagonNumber.trim().toLocaleLowerCase('tr-TR'))).size,workload,actualLabor,workingLabor,waitingLabor,
  average:operations.length?workload/operations.length:0,netEfficiency:workingLabor>0?workload/workingLabor*100:null,grossEfficiency:actualLabor>0?workload/actualLabor*100:null};
}
