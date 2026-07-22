import {describe,expect,it} from 'vitest'
import {byPlatform,summarize,demoPerformance} from './performance'
describe('performance aggregation',()=>{it('calculates actionable totals and rates',()=>{const result=summarize(demoPerformance);expect(result.views).toBe(43990);expect(result.orders).toBe(38);expect(result.engagementRate).toBeGreaterThan(0)});it('keeps platform totals separate',()=>{expect(byPlatform(demoPerformance).find(item=>item.platform==='抖音')?.orders).toBe(21)});it('returns safe zero rates without views',()=>{expect(summarize([]).conversionRate).toBe(0)})})
