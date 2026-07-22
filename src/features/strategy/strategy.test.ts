import { describe, expect, it } from 'vitest'
import { demoPerformance } from '../analytics/performance'
import { buildStrategy, strategyAsText } from './strategy'

describe('content strategy', () => {
  it('turns performance evidence into three actionable recommendations', () => {
    const result = buildStrategy(demoPerformance)
    expect(result.recommendations).toHaveLength(3)
    expect(result.recommendations.map(item => item.type)).toEqual(['互动', '转化', '商品'])
    expect(result.schedule).toHaveLength(4)
    expect(result.recommendations[0].evidence).toContain('《')
  })
  it('handles an empty dataset safely', () => expect(buildStrategy([]).recommendations).toEqual([]))
  it('exports evidence and actions in a readable plan', () => expect(strategyAsText(demoPerformance)).toContain('依据：'))
})
