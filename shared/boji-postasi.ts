import type { Standard } from './workshop';

// Stable IDs are separate from the Hava&Fren catalog; minutes remain unset until approved standards are supplied.
export const BOJI_POSTASI_JOBS = [
 ['Yan Yastık', 'Yan yastık değişti', 0],
 ['Yan Yastık', 'Yan yastık sustası değişti', 0],
 ['Yan Yastık', 'Yan yastık saplama değişti', 0],
 ['Yan Yastık', 'Yan yastık somun değişti', 0],
 ['Yan Yastık', 'Yan yastık somun sıkıldı', 0],
 ['Teker İşlemleri', 'Teker değişimi', 0],
] as const;
export const BOJI_POSTASI_JOB_IDS = BOJI_POSTASI_JOBS.map((_, index) => 2001 + index);
export const BOJI_WHEEL_CHANGE_JOB_ID = 2001 + BOJI_POSTASI_JOBS.findIndex(([, name]) => name === 'Teker değişimi');
export function isBojiPostasiJob(id:number):boolean { return id>=2001&&id<2001+BOJI_POSTASI_JOBS.length; }
export function isBojiPostasiQuantityJob(id:number):boolean { return isBojiPostasiJob(id); }
export function ensureBojiPostasiStandards(standards:Standard[]):void {
 const effectiveAt='2026-10-20T00:00:00.000Z';
 BOJI_POSTASI_JOBS.forEach(([category,name,minutes],index)=>{
  const id=2001+index;
  const versions=standards.filter(standard=>standard.id===id).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
  const current=versions[0];
  if(!current){standards.push({id,versionId:`boji-postasi-${id}-2026-10-20`,name,category,standardMinutes:minutes,active:true,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null});return;}
  if(current.versionId===`boji-postasi-${id}-2026-10-20`)return;
  if(current.validFrom>=effectiveAt)throw new Error('Boji iş standardı geçerlilik tarihi yeni sürümle çakışıyor.');
  current.validUntil=effectiveAt;
  standards.push({id,versionId:`boji-postasi-${id}-2026-10-20`,name,category,standardMinutes:minutes,active:true,validFrom:effectiveAt,validUntil:null});
 });
}
