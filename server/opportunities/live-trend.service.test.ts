import { describe, expect, it } from 'vitest'
import { mapSearchFeedsToMetric } from './live-trend.service'

describe('live Xiaohongshu trend mapping', () => {
  it('derives transparent proxy metrics from real search feed interactions', () => {
    const metric = mapSearchFeedsToMetric('非遗漆扇', [
      { id: '1', user: { user_id: 'u1' }, note_card: { interact_info: { liked_count: '120', collected_count: '40', comment_count: '10' } } },
      { id: '2', user: { user_id: 'u2' }, note_card: { interact_info: { liked_count: '80', collected_count: '30', comment_count: '5' } } },
    ])

    expect(metric).toMatchObject({ keyword: '非遗漆扇', noteCount: 2, competitorCount: 2, growthRate: 0 })
    expect(metric.searchHeat).toBe(485)
    expect(metric.engagementRate).toBeGreaterThan(0)
  })
})
