import type { Standard } from './workshop';

// Stable row positions preserve job IDs in historical records. Minutes come from the 18 October 2026 list.
export const FREN_POSTASI_JOBS = [
 // Genel İşlemler ve Testler
 ['Genel İşlemler ve Testler', 'Mekanik kontrol ve bakım yapıldı. El freni, hareketli kollar', 30],
 ['Genel İşlemler ve Testler', 'Vagonun altı kanalda incelendi', 5],
 ['Genel İşlemler ve Testler', 'Sızdırmazlık kontrolü yapıldı', 5],
 ['Genel İşlemler ve Testler', 'Fren tecrübesi yapıldı', 20],
 ['Genel İşlemler ve Testler', 'Emniyet çemberleri düzeltildi', 5],
 ['Genel İşlemler ve Testler', 'Emniyet çemberi eksik vida-somun takıldı', 5],
 // Fren Bağlantıları İşlemleri
 ['Fren Bağlantıları İşlemleri', 'Sensör hortumları söküldü', 5],
 ['Fren Bağlantıları İşlemleri', 'Sensör hortumları takıldı', 5],
 ['Fren Bağlantıları İşlemleri', 'Regülatör çubuğu söküldü', 10],
 ['Fren Bağlantıları İşlemleri', 'Regülatör çubuğu takıldı', 10],
 // Ana Hava ve Akerman İşlemleri
 ['Ana Hava ve Akerman İşlemleri', 'Akerman tepe contası değişti', 10],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman ağız contası değişti', 5],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman göbek contası değişti', 20],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman musluğu değişti', 30],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman hortumu değişti', 10],
 ['Ana Hava ve Akerman İşlemleri', 'Ana hava (kondüvit) borusu tamiri yapıldı', 30],
 // Kol Mekanizmaları İşlemleri
 ['Kol Mekanizmaları İşlemleri', 'El freni sıkışıklığı tamir edildi', 30],
 ['Kol Mekanizmaları İşlemleri', 'El freni gidonu tamir edildi', 10],
 ['Kol Mekanizmaları İşlemleri', 'El freni gidonu değişti', 15],
 ['Kol Mekanizmaları İşlemleri', 'El freni vidalı mil yuvası temizlendi', 60],
 ['Kol Mekanizmaları İşlemleri', 'El freni vidalı mili değişti', 30],
 ['Kol Mekanizmaları İşlemleri', 'Fren iptal kolu tamir edildi', 10],
 ['Kol Mekanizmaları İşlemleri', 'Fren iptal kolu değişti', 40],
 ['Kol Mekanizmaları İşlemleri', 'Fren iptal levhası değişti', 40],
 ['Kol Mekanizmaları İşlemleri', 'Yük-yolcu kolu değişti', 30],
 ['Kol Mekanizmaları İşlemleri', 'Yük-yolcu levhası değişti', 40],
 ['Kol Mekanizmaları İşlemleri', 'Dolu-boş kolu mekanizması tamir edildi', 60],
 ['Kol Mekanizmaları İşlemleri', 'Dolu-boş kolu değişti', 30],
 // Triblivalf İşlemleri
 ['Triblivalf İşlemleri', 'Valf Toz çantası kontrolü ve temizliği yapıldı', 15],
 ['Triblivalf İşlemleri', 'Triblivalf söküldü', 15],
 ['Triblivalf İşlemleri', 'Triblivalf takıldı', 15],
 // Yük Sensörü İşlemleri
 ['Yük Sensörü İşlemleri', 'Yük sensörü söküldü', 90],
 ['Yük Sensörü İşlemleri', 'Yük sensörü takıldı', 90],
 ['Yük Sensörü İşlemleri', 'Sensör hortumu değişti', 15],
 ['Yük Sensörü İşlemleri', 'Sensör hortumu contası takıldı', 10],
 // Yön Sensörü İşlemleri
 ['Yön Sensörü İşlemleri', 'Yön sensörü söküldü', 30],
 ['Yön Sensörü İşlemleri', 'Yön sensörü takıldı', 30],
 // Mekanik Fren Tertibatı
 ['Mekanik Fren Tertibatı', 'Sabo değişti', 5],
 ['Mekanik Fren Tertibatı', 'Orta fren manivela tertibatı değişti', 0],
 ['Mekanik Fren Tertibatı', 'Çarık değişti', 25],
 ['Mekanik Fren Tertibatı', 'Tringale çarık seti değişti', 90],
 ['Mekanik Fren Tertibatı', 'Emniyet çemberleri düzeltildi', 5],
 ['Mekanik Fren Tertibatı', 'Emniyet çemberi eksik vida-somun takıldı', 5],
 ['Mekanik Fren Tertibatı', 'Emniyet çemberi değişti', 30],
 // Regülatör İşlemleri
 ['Regülatör İşlemleri', 'Regülatör delik ayarı yapıldı', 30],
 ['Regülatör İşlemleri', 'Regülatör bağlantı pernosu değişti', 0],
 ['Regülatör İşlemleri', 'Regülatör değişti', 180],
 // Fren Silindiri İşlemleri
 ['Fren Silindiri İşlemleri', 'Fren silindiri contası değişti', 60],
 ['Fren Silindiri İşlemleri', 'Fren silindiri bakımı yapıldı', 10],
 // Compact Fren İşlemleri
 ['Compact Fren İşlemleri', 'Compact regülatör ayarı yapıldı', 5],
 ['Compact Fren İşlemleri', 'Compact fren regülatör aktarma plakası tamir edildi', 240],
 ['Compact Fren İşlemleri', 'Compact fren perno arızası tamir edildi', 240],

 // Yeni işler eski kimlikleri kaydırmamak için sona eklenir.
 ['Genel İşlemler ve Testler', 'Vagon krikoya kaldırma indirme', 15],
 ['Kol Mekanizmaları İşlemleri', 'Dolu-boş levhası değişti', 30],
 ['Regülatör İşlemleri', 'Regülatör çubuğu söküldü', 10],
 ['Regülatör İşlemleri', 'Regülatör çubuğu takıldı', 10],
 ['Compact Fren İşlemleri', 'Compact regülatör sök tak', 30],
] as const;
export const FREN_POSTASI_JOB_IDS = FREN_POSTASI_JOBS.map((_, index) => 1001 + index);
const RETIRED_JOB_NAMES = new Set(['Orta fren manivela tertibatı değişti', 'Regülatör bağlantı pernosu değişti']);
export function isCurrentFrenPostasiJob(id:number):boolean { const row=FREN_POSTASI_JOBS[id-1001];return !!row&&!RETIRED_JOB_NAMES.has(row[1]); }
// The source marks these work items with “(adet)”; keep that marker out of saved job names.
const QUANTITY_JOB_NAMES = new Set([
 'Emniyet çemberi eksik vida-somun takıldı',
 'Sensör hortumları söküldü', 'Sensör hortumları takıldı',
 'Regülatör çubuğu söküldü', 'Regülatör çubuğu takıldı',
 'Akerman tepe contası değişti', 'Akerman ağız contası değişti',
 'Akerman göbek contası değişti', 'Akerman musluğu değişti',
 'Akerman hortumu değişti', 'Yük sensörü söküldü',
 'Yük sensörü takıldı', 'Sensör hortumu değişti',
 'Sensör hortumu contası takıldı', 'Yön sensörü söküldü',
 'Yön sensörü takıldı', 'Sabo değişti',
 'Emniyet çemberi değişti', 'Regülatör delik ayarı yapıldı', 'Regülatör değişti', 'Fren silindiri contası değişti', 'Fren silindiri bakımı yapıldı', 'Compact regülatör ayarı yapıldı', 'Compact fren regülatör aktarma plakası tamir edildi', 'Compact fren perno arızası tamir edildi', 'Compact regülatör sök tak',
]);
export function isFrenPostasiQuantityJob(id:number):boolean {
 const row=FREN_POSTASI_JOBS[id-1001];
 return !!row&&QUANTITY_JOB_NAMES.has(row[1]);
}

export const BRAKE_TEST_JOB_ID = 1001 + FREN_POSTASI_JOBS.findIndex(([,name]) => name === 'Fren tecrübesi yapıldı');
export type BrakeMode = 'G' | 'P';
export function brakeModeLabel(mode:BrakeMode):string{return mode==='G'?'G(yük)':'P(yolcu)';}
export function isFrenPostasiJob(id:number):boolean{return id>=1001&&id<1001+FREN_POSTASI_JOBS.length;}

export function ensureFrenPostasiStandards(standards:Standard[]):void {
 const effectiveAt='2026-10-18T13:30:00.000Z';
 FREN_POSTASI_JOBS.forEach(([category,name,minutes],index)=>{
  const id=1001+index,active=isCurrentFrenPostasiJob(id);
  const versions=standards.filter(standard=>standard.id===id).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
  const current=versions[0];
  if(!current){standards.push({id,versionId:`fren-postasi-${id}-2026-10-18`,name,category,standardMinutes:minutes,active,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null});return;}
  if(current.versionId===`fren-postasi-${id}-2026-10-18`)return;
  if(current.validFrom>=effectiveAt)throw new Error('Fren iş standardı geçerlilik tarihi yeni sürümle çakışıyor.');
  current.validUntil=effectiveAt;
  standards.push({id,versionId:`fren-postasi-${id}-2026-10-18`,name,category,standardMinutes:minutes,active,validFrom:effectiveAt,validUntil:null});
 });
}
