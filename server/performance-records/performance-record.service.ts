import { randomUUID } from 'node:crypto'
import type { PerformanceRecordInput } from './performance-record.schema'
import type { createPerformanceRecordRepository } from './performance-record.repository'
export class PerformanceRecordNotFoundError extends Error {}
export function createPerformanceRecordService(repository:ReturnType<typeof createPerformanceRecordRepository>){return{
  list:(query:{platform:string;productName:string})=>repository.list(query),
  create(input:PerformanceRecordInput){const now=new Date().toISOString();return repository.save({...input,id:randomUUID(),createdAt:now,updatedAt:now})},
  importMany(inputs:PerformanceRecordInput[]){
    const fingerprint=(record:Pick<PerformanceRecordInput,'platform'|'title'|'recordedOn'>)=>`${record.platform}\u0000${record.title.trim().toLocaleLowerCase()}\u0000${record.recordedOn}`
    const known=new Set(repository.list({platform:'',productName:''}).map(fingerprint))
    const unique:PerformanceRecordInput[]=[]
    let skipped=0
    for(const input of inputs){const key=fingerprint(input);if(known.has(key)){skipped+=1;continue}known.add(key);unique.push(input)}
    const now=new Date().toISOString()
    const records=repository.saveMany(unique.map(input=>({...input,id:randomUUID(),createdAt:now,updatedAt:now})))
    return{created:records.length,skipped,records}
  },
  update(id:string,input:PerformanceRecordInput){const current=repository.find(id);if(!current)throw new PerformanceRecordNotFoundError('表现记录不存在');return repository.save({...current,...input,updatedAt:new Date().toISOString()})},
  remove(id:string){if(!repository.remove(id))throw new PerformanceRecordNotFoundError('表现记录不存在')},
}}
