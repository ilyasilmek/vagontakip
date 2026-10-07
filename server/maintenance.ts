import { z } from 'zod';
import { WAIT_REASONS, type JobType } from '../shared/maintenance';
import { ApiError } from './errors';

export const jobTypeSchema=z.object({id:z.number().int().positive(),name:z.string().min(1).max(200),standardMinutes:z.number().int().positive().max(10000),category:z.string().min(1).max(100)});
const fields={
 wagonNumber:z.string().trim().min(1).max(200),startedAt:z.string().datetime({offset:true}),finishedAt:z.string().datetime({offset:true}),
 shift:z.string().trim().min(1).max(100),supervisor:z.string().trim().min(1).max(100),personnel:z.number().int().min(1).max(100),
 waits:z.array(z.object({reason:z.enum(WAIT_REASONS),minutes:z.number().int().positive().max(100000),note:z.string().trim().max(500)}).strict()).max(50),notes:z.string().trim().max(10000),
};
const inputJobs=z.array(z.object({jobTypeId:z.number().int().positive(),quantity:z.number().int().positive().max(1000)}).strict()).min(1).max(49);
export const maintenanceInputSchema=z.object({...fields,jobs:inputJobs}).strict();
export const maintenanceRecordSchema=z.object({...fields,jobs:z.array(jobTypeSchema.extend({quantity:z.number().int().positive().max(1000)})).min(1).max(49),id:z.string().min(1),revision:z.number().int().positive(),createdAt:z.string(),updatedAt:z.string(),updatedBy:z.string()}).superRefine((o,ctx)=>{
 if(Date.parse(o.finishedAt)<=Date.parse(o.startedAt))ctx.addIssue({code:'custom',message:'Bitiş zamanı başlangıçtan sonra olmalı.'});
 if(o.waits.reduce((sum,w)=>sum+w.minutes,0)>(Date.parse(o.finishedAt)-Date.parse(o.startedAt))/60000)ctx.addIssue({code:'custom',message:'Bekleme süresi gerçekleşen süreden uzun olamaz.'});
 if(new Set(o.jobs.map(j=>j.id)).size!==o.jobs.length)ctx.addIssue({code:'custom',message:'Aynı iş kalemi tekrar seçilemez; adedini değiştirin.'});
});
export function resolveJobs(jobs:z.infer<typeof inputJobs>,catalog:JobType[]) {
 return jobs.map(item=>{
  const job=catalog.find(j=>j.id===item.jobTypeId);
  if(!job)throw new ApiError(400,'INVALID_JOB','İş kalemi bulunamadı.');
  return {...job,quantity:item.quantity};
 });
}
