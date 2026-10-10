import type { Standard } from './workshop';

// FREN POSTASI.txt source list: names and categories only; no standard minutes were provided.
export const FREN_POSTASI_JOBS = [
 // Genel İşlemler ve Testler
 ['Genel İşlemler ve Testler', 'Mekanik kontrol ve bakım yapıldı. El freni, hareketli kollar'],
 ['Genel İşlemler ve Testler', 'Vagonun altı kanalda incelendi'],
 ['Genel İşlemler ve Testler', 'Sızdırmazlık kontrolü yapıldı'],
 ['Genel İşlemler ve Testler', 'Fren tecrübesi yapıldı'],
 ['Genel İşlemler ve Testler', 'Emniyet çemberleri düzeltildi'],
 ['Genel İşlemler ve Testler', 'Emniyet çemberi eksik vida-somun takıldı'],
 // Fren Bağlantıları İşlemleri
 ['Fren Bağlantıları İşlemleri', 'Sensör hortumları söküldü'],
 ['Fren Bağlantıları İşlemleri', 'Sensör hortumları takıldı'],
 ['Fren Bağlantıları İşlemleri', 'Regülatör çubuğu söküldü'],
 ['Fren Bağlantıları İşlemleri', 'Regülatör çubuğu takıldı'],
 // Ana Hava ve Akerman İşlemleri
 ['Ana Hava ve Akerman İşlemleri', 'Akerman tepe contası değişti'],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman ağız contası değişti'],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman göbek contası değişti'],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman musluğu değişti'],
 ['Ana Hava ve Akerman İşlemleri', 'Akerman hortumu değişti'],
 ['Ana Hava ve Akerman İşlemleri', 'Ana hava (kondüvit) borusu tamiri yapıldı'],
 // Kol Mekanizmaları İşlemleri
 ['Kol Mekanizmaları İşlemleri', 'El freni sıkışıklığı tamir edildi'],
 ['Kol Mekanizmaları İşlemleri', 'El freni gidonu tamir edildi'],
 ['Kol Mekanizmaları İşlemleri', 'El freni gidonu değişti'],
 ['Kol Mekanizmaları İşlemleri', 'El freni vidalı mil yuvası temizlendi'],
 ['Kol Mekanizmaları İşlemleri', 'El freni vidalı mili değişti'],
 ['Kol Mekanizmaları İşlemleri', 'Fren iptal kolu tamir edildi'],
 ['Kol Mekanizmaları İşlemleri', 'Fren iptal kolu değişti'],
 ['Kol Mekanizmaları İşlemleri', 'Fren iptal levhası değişti'],
 ['Kol Mekanizmaları İşlemleri', 'Yük-yolcu kolu değişti'],
 ['Kol Mekanizmaları İşlemleri', 'Yük-yolcu levhası değişti'],
 ['Kol Mekanizmaları İşlemleri', 'Dolu-boş kolu mekanizması tamir edildi'],
 ['Kol Mekanizmaları İşlemleri', 'Dolu-boş kolu değişti'],
 // Triblivalf İşlemleri
 ['Triblivalf İşlemleri', 'Valf Toz çantası kontrolü ve temizliği yapıldı'],
 ['Triblivalf İşlemleri', 'Triblivalf söküldü'],
 ['Triblivalf İşlemleri', 'Triblivalf takıldı'],
 // Yük Sensörü İşlemleri
 ['Yük Sensörü İşlemleri', 'Yük sensörü söküldü'],
 ['Yük Sensörü İşlemleri', 'Yük sensörü takıldı'],
 ['Yük Sensörü İşlemleri', 'Sensör hortumu değişti'],
 ['Yük Sensörü İşlemleri', 'Sensör hortumu contası takıldı'],
 // Yön Sensörü İşlemleri
 ['Yön Sensörü İşlemleri', 'Yön sensörü söküldü'],
 ['Yön Sensörü İşlemleri', 'Yön sensörü takıldı'],
 // Mekanik Fren Tertibatı
 ['Mekanik Fren Tertibatı', 'Sabo değişti'],
 ['Mekanik Fren Tertibatı', 'Orta fren manivela tertibatı değişti'],
 ['Mekanik Fren Tertibatı', 'Çarık değişti'],
 ['Mekanik Fren Tertibatı', 'Tringale çarık seti değişti'],
 ['Mekanik Fren Tertibatı', 'Emniyet çemberleri düzeltildi'],
 ['Mekanik Fren Tertibatı', 'Emniyet çemberi eksik vida-somun takıldı'],
 ['Mekanik Fren Tertibatı', 'Emniyet çemberi değişti'],
 // Regülatör İşlemleri
 ['Regülatör İşlemleri', 'Regülatör delik ayarı yapıldı'],
 ['Regülatör İşlemleri', 'Regülatör bağlantı pernosu değişti'],
 ['Regülatör İşlemleri', 'Regülatör değişti'],
 // Fren Silindiri İşlemleri
 ['Fren Silindiri İşlemleri', 'Fren silindiri contası değişti'],
 ['Fren Silindiri İşlemleri', 'Fren silindiri bakımı yapıldı'],
 // Compact Fren İşlemleri
 ['Compact Fren İşlemleri', 'Compact regülatör ayarı yapıldı'],
 ['Compact Fren İşlemleri', 'Compact fren iletken plaka arızası tamir edildi'],
 ['Compact Fren İşlemleri', 'Compact fren perno arızası tamir edildi'],
] as const;
export const FREN_POSTASI_JOB_IDS = FREN_POSTASI_JOBS.map((_, index) => 1001 + index);
export const BRAKE_TEST_JOB_ID = 1001 + FREN_POSTASI_JOBS.findIndex(([,name]) => name === 'Fren tecrübesi yapıldı');
export type BrakeMode = 'G' | 'P';
export function brakeModeLabel(mode:BrakeMode):string{return mode==='G'?'G(yük)':'P(yolcu)';}
const legacyMatches:Record<string,number>={
 'Sızdırmazlık kontrolü yapıldı':41,
 'Fren tecrübesi yapıldı':42,
 'Emniyet çemberleri düzeltildi':15,
 'Emniyet çemberi eksik vida-somun takıldı':14,
 'Akerman tepe contası değişti':29,
 'Akerman ağız contası değişti':30,
 'Akerman göbek contası değişti':31,
 'Valf Toz çantası kontrolü ve temizliği yapıldı':33,
 'Triblivalf söküldü':2,
 'Triblivalf takıldı':3,
 'Yük sensörü söküldü':6,
 'Yük sensörü takıldı':7,
 'Yön sensörü söküldü':4,
 'Yön sensörü takıldı':5,
 'Sabo değişti':1,
 'Tringale çarık seti değişti':24,
 'Regülatör delik ayarı yapıldı':10,
 'Dolu-boş kolu mekanizması tamir edildi':45,
};

export function isFrenPostasiJob(id:number):boolean{return id>=1001&&id<1001+FREN_POSTASI_JOBS.length;}

export function ensureFrenPostasiStandards(standards:Standard[]):void {
 FREN_POSTASI_JOBS.forEach(([category,name],index)=>{
  const id=1001+index;
  if(standards.some(standard=>standard.id===id))return;
  const oldId=legacyMatches[name];
  const old=standards.filter(standard=>standard.id===oldId&&standard.validUntil===null).at(-1);
  standards.push({id,versionId:`fren-postasi-${id}`,name,category,standardMinutes:old?.standardMinutes??0,active:true,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null});
 });
}
