import { expect,it } from 'vitest';
import { workEntryHours, type WorkEntry } from '../../shared/work-entry';

it('iş dakikalarını ekip sayısıyla A/S hesaplar; bakım tarih aralığını süreye katmaz',()=>{
 const entry:WorkEntry={id:'x',wagonNumber:'3175 4568 337-5',actorId:'a',actorName:'A',post:'Hava-Fren',startedAt:'2026-10-10T00:00:00.000Z',finishedAt:'2026-10-11T00:00:00.000Z',crew:[{id:'a',name:'A'},{id:'b',name:'B'}],jobs:[{id:1,name:'Kontrol',category:'Kontrol',quantity:1,standardMinutes:10},{id:-1,name:'Ek iş',category:'Ek iş',quantity:1,durationMinutes:20},{id:-1001,name:'Ağır bakım',category:'Ağır bakım',quantity:1,heavyMinutes:30}],notes:'',createdAt:'2026-10-10T00:00:00.000Z'};
 const result=workEntryHours(entry);
 expect(result.elapsedMinutes).toBe(1440);
 expect(result.totalLaborHours).toBe(2);
 expect(result.heavyLaborHours).toBe(1);
});
