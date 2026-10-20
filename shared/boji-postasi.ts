import type { Standard } from './workshop';

// Existing IDs 2001–2006 are retained so saved maintenance history remains stable.
// Tuple fields: category, display name, standard minutes, stable ID, quantity selector.
export const BOJI_POSTASI_JOBS = [
 ['Genel İşlemler', 'Vagon krikoya kaldırıldı, boji bağlantıları söküldü ve dışarıda genel kontrolleri yapıldı', 0, 2007, false],
 ['Genel İşlemler', 'Vagon krikodan indirildi, boji bağlantıları takıldı', 0, 2008, false],
 ['Genel İşlemler', 'Gevşek T bragalar sıkıldı', 0, 2009, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Yan yastık takımı değişti', 0, 2001, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Yan yastık sustası değişti', 0, 2002, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Yan yastık saplama değişti', 0, 2003, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Yan yastık somun değişti', 0, 2004, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Yan yastık somun gevşekti, sıkıldı', 0, 2005, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Boji göbek pernosu söküldü, içi temizlendi ve takıldı', 0, 2010, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Boji göbek pernosu değişti', 0, 2011, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Polyemit göbek tası etrafı temizlendi', 0, 2012, true],
 ['Yan Yastık, Boji Göbek Pernosu', 'Polyemit göbek tası değişti', 0, 2013, true],
 ['T Braga, Topraklama Kablosu', 'Gevşek T bragalar sıkıldı', 0, 2014, true],
 ['T Braga, Topraklama Kablosu', 'T braga değişti', 0, 2015, true],
 ['T Braga, Topraklama Kablosu', 'Topraklama kablosu değişti', 0, 2016, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Buatagres kapağı açıldı ve yağı yenilendi', 0, 2017, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Buatagres contası değişti', 0, 2018, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Teker dış sustası değişti', 0, 2019, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Teker iç sustası değişti', 0, 2020, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Mangan plaka değişti', 0, 2021, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Mangan plaka kırıktı, kaynak yapıldı', 0, 2022, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Menot değişti', 0, 2023, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Şapka bileziği kaynak yapıldı', 0, 2024, true],
 ['Buatagres, Susta, Mangan Plaka, Menot, Şapka', 'Şapka değişti', 0, 2025, true],
 ['Teker İşlemleri', 'Teker değişti', 0, 2006, true],
 ['ULM İşlemleri', 'ULM yapıldı', 0, 2026, true],
] as const;
export const BOJI_POSTASI_JOB_IDS: number[] = BOJI_POSTASI_JOBS.map(([, , , id]) => id);
export const BOJI_WHEEL_CHANGE_JOB_ID = 2006;
export const BOJI_ULM_JOB_ID = 2026;
export function isBojiPostasiJob(id:number):boolean { return BOJI_POSTASI_JOB_IDS.includes(id); }
export function isBojiPostasiQuantityJob(id:number):boolean { return BOJI_POSTASI_JOBS.some(([, , , jobId, quantity])=>jobId===id&&quantity); }
export function ensureBojiPostasiStandards(standards:Standard[]):void {
 const effectiveAt='2026-10-20T12:00:00.000Z';
 BOJI_POSTASI_JOBS.forEach(([category,name,minutes,id])=>{
  const versionId='boji-postasi-'+id+'-2026-10-20-v2';
  const versions=standards.filter(standard=>standard.id===id).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
  const current=versions[0];
  if(!current){standards.push({id,versionId,name,category,standardMinutes:minutes,active:true,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null});return;}
  if(current.versionId===versionId)return;
  if(current.validFrom>=effectiveAt)throw new Error('Boji iş standardı geçerlilik tarihi yeni sürümle çakışıyor.');
  current.validUntil=effectiveAt;
  standards.push({id,versionId,name,category,standardMinutes:minutes,active:true,validFrom:effectiveAt,validUntil:null});
 });
}