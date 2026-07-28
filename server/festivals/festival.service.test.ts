import { describe, expect, it } from 'vitest'
import { buildFestivalPlan, calculateMape } from './festival.service'

describe('festival planning', () => {
  it('creates a strong reminder exactly 30 days before a festival', () => {
    const [plan] = buildFestivalPlan(new Date('2026-07-20T00:00:00+08:00'), [{ name: '七夕', date: '2026-08-19', baselineViews: 10000, uplift: 1.8 }])
    expect(plan).toMatchObject({ name: '七夕', daysRemaining: 30, reminderLevel: 'strong', predictedViews: 18000 })
    expect(plan.milestones).toEqual(expect.arrayContaining(['启动选品与备货', '完成首轮内容素材']))
  })

  it('provides a prediction interval and marks expired festivals', () => {
    const [plan] = buildFestivalPlan(new Date('2026-09-01T00:00:00+08:00'), [{ name: '七夕', date: '2026-08-19', baselineViews: 10000, uplift: 1.8 }])
    expect(plan.reminderLevel).toBe('expired')
    expect(plan.predictionInterval.low).toBeLessThan(plan.predictedViews)
    expect(plan.predictionInterval.high).toBeGreaterThan(plan.predictedViews)
  })

  it('calculates forecast backtest error without dividing by zero', () => {
    expect(calculateMape([{ predicted: 120, actual: 100 }, { predicted: 80, actual: 100 }])).toBe(20)
    expect(calculateMape([{ predicted: 10, actual: 0 }])).toBeNull()
  })
})
