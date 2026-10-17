import type { BrakeMode } from './fren-postasi';
export interface WorkEntry {
 id:string; wagonId?:string; wagonNumber:string; actorId:string; actorName:string; post:string;
 startedAt:string; finishedAt:string;
 jobs:{id:number;name:string;category:string;quantity:number;brakeMode?:BrakeMode;durationMinutes?:number;durationSeconds?:number;loadDurationSeconds?:number;passengerDurationSeconds?:number;heavyMinutes?:number;standardMinutes?:number;overrideMinutes?:number}[];
 crew?:{id:string;name:string}[]; notes:string; createdAt:string; revision?:number;
}

export function workEntryHours(entry:WorkEntry){
 const people=entry.crew?.length??1;
 const elapsedMinutes=(Date.parse(entry.finishedAt)-Date.parse(entry.startedAt))/60000;
 const heavyMinutes=entry.jobs.reduce((sum,job)=>sum+(job.heavyMinutes??(job.overrideMinutes!==undefined?Math.max(0,job.overrideMinutes-(job.standardMinutes??0))*job.quantity:0)),0);
 const customMinutes=entry.jobs.reduce((sum,job)=>sum+(job.category==='Ek iş'?(job.durationMinutes??0):0),0);
 const missingDuration=entry.jobs.some(job=>job.heavyMinutes===undefined&&job.overrideMinutes===undefined&&job.durationMinutes===undefined&&job.durationSeconds===undefined&&job.loadDurationSeconds===undefined&&job.passengerDurationSeconds===undefined&&!(job.standardMinutes&&job.standardMinutes>0));
 const workMinutes=entry.jobs.reduce((sum,job)=>sum+(job.heavyMinutes??job.overrideMinutes??(job.loadDurationSeconds!==undefined&&job.passengerDurationSeconds!==undefined?(job.loadDurationSeconds+job.passengerDurationSeconds)/60:undefined)??(job.durationSeconds===undefined?undefined:job.durationSeconds/60)??job.durationMinutes??job.standardMinutes??0)*job.quantity,0);
 return {people,elapsedMinutes,knownLaborHours:workMinutes*people/60,totalLaborHours:missingDuration?null:workMinutes*people/60,heavyLaborHours:heavyMinutes*people/60,customLaborHours:customMinutes*people/60};
}
