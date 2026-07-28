export type FestivalSeed = { name: string; date: string; baselineViews: number; uplift: number }

export function buildFestivalPlan(today: Date, festivals: FestivalSeed[]) {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return festivals.map(festival => {
    const [year, month, day] = festival.date.split('-').map(Number)
    const daysRemaining = Math.round((Date.UTC(year, month - 1, day) - todayUtc) / 86400000)
    const predictedViews = Math.round(festival.baselineViews * festival.uplift)
    return {
      ...festival,
      daysRemaining,
      predictedViews,
      predictionInterval: { low: Math.round(predictedViews * 0.82), high: Math.round(predictedViews * 1.18) },
      reminderLevel: daysRemaining < 0 ? 'expired' as const : daysRemaining <= 30 ? 'strong' as const : daysRemaining <= 60 ? 'prepare' as const : 'normal' as const,
      milestones: daysRemaining <= 30 && daysRemaining >= 0
        ? ['启动选品与备货', '完成首轮内容素材', '安排达人种草与发布排期']
        : ['观察趋势与竞品', '准备候选商品'],
    }
  }).sort((a, b) => a.daysRemaining - b.daysRemaining)
}

export function calculateMape(records: Array<{ predicted: number; actual: number }>) {
  const usable = records.filter(record => record.actual > 0)
  if (!usable.length) return null
  return Number((usable.reduce((sum, record) => sum + Math.abs(record.predicted - record.actual) / record.actual, 0) / usable.length * 100).toFixed(1))
}

export const festivalSeeds: FestivalSeed[] = [
  { name: '七夕', date: '2026-08-19', baselineViews: 12000, uplift: 1.85 },
  { name: '教师节', date: '2026-09-10', baselineViews: 9000, uplift: 1.55 },
  { name: '中秋节', date: '2026-09-25', baselineViews: 15000, uplift: 1.7 },
  { name: '国庆节', date: '2026-10-01', baselineViews: 13000, uplift: 1.45 },
  { name: '圣诞节', date: '2026-12-25', baselineViews: 16500, uplift: 1.65 },
  { name: '春节', date: '2027-02-06', baselineViews: 22000, uplift: 2.1 },
]
