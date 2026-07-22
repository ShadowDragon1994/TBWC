import { randomUUID } from 'node:crypto'
import type { PerformanceRecordInput } from './performance-record.schema'
import type { createPerformanceRecordRepository } from './performance-record.repository'
export class PerformanceRecordNotFoundError extends Error {}
export function createPerformanceRecordService(repository:ReturnType<typeof createPerformanceRecordRepository>){return{
  list:(query:{platform:string;productName:string})=>repository.list(query),
  create(input:PerformanceRecordInput){const now=new Date().toISOString();return repository.save({...input,id:randomUUID(),createdAt:now,updatedAt:now})},
  update(id:string,input:PerformanceRecordInput){const current=repository.find(id);if(!current)throw new PerformanceRecordNotFoundError('表现记录不存在');return repository.save({...current,...input,updatedAt:new Date().toISOString()})},
  remove(id:string){if(!repository.remove(id))throw new PerformanceRecordNotFoundError('表现记录不存在')},
}}
