import { describe, expect, it } from 'vitest'
import { demoPerformance } from '../analytics/performance'
import { buildStrategy, scheduleToPublishingDraft, strategyAsText, taskMatchesSchedule } from './strategy'

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
  it('maps a strategy item to next week publishing time and fields', () => {
    const item = buildStrategy(demoPerformance).schedule[0]
    const draft = scheduleToPublishingDraft(item, new Date('2026-07-23T02:00:00.000Z'))
    expect(draft).toMatchObject({ productName: item.productName, platform: item.platform, title: item.topic, status: 'editing' })
    expect(draft.plannedAt).toBe('2026-07-27T02:00:00.000Z')
  })
  it('detects a task already created for the same topic and day', () => {
    const item = buildStrategy(demoPerformance).schedule[0]
    const draft = scheduleToPublishingDraft(item, new Date('2026-07-23T02:00:00.000Z'))
    expect(taskMatchesSchedule({ ...draft, id: 'task', actualPublishedAt: null, createdAt: '', updatedAt: '' }, item, new Date('2026-07-23T02:00:00.000Z'))).toBe(true)
  })
})
