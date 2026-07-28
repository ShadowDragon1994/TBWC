import { describe, expect, it } from 'vitest'
import { analyzeOpportunities } from './opportunity.service'

describe('Xiaohongshu opportunity analysis', () => {
  it('ranks high-demand, fast-growing and low-supply keywords first', () => {
    const results = analyzeOpportunities([
      { keyword: '非遗漆扇礼盒', searchHeat: 8800, noteCount: 900, growthRate: 0.42, engagementRate: 0.12, competitorCount: 18 },
      { keyword: '普通马克杯', searchHeat: 12000, noteCount: 18000, growthRate: 0.02, engagementRate: 0.03, competitorCount: 430 },
    ])

    expect(results[0].keyword).toBe('非遗漆扇礼盒')
    expect(results[0].score).toBeGreaterThan(results[1].score)
    expect(results[0].signals).toEqual(expect.arrayContaining(['需求供给比高', '近7日增长快']))
  })

  it('normalizes scores to 0-100 and explains weak opportunities', () => {
    const [result] = analyzeOpportunities([
      { keyword: '成熟红海品类', searchHeat: 100, noteCount: 50000, growthRate: -0.2, engagementRate: 0.01, competitorCount: 900 },
    ])

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.risk).toBe('high')
    expect(result.signals).toContain('供给或竞品偏多')
  })

  it('rejects invalid source metrics instead of producing misleading scores', () => {
    expect(() => analyzeOpportunities([
      { keyword: '异常数据', searchHeat: -1, noteCount: 0, growthRate: 0, engagementRate: 0, competitorCount: 0 },
    ])).toThrow('趋势数据无效')
    expect(() => analyzeOpportunities([
      { keyword: '非数值数据', searchHeat: Number.NaN, noteCount: 0, growthRate: 0, engagementRate: 0, competitorCount: 0 },
    ])).toThrow('趋势数据无效')
  })
})
