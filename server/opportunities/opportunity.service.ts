export type TrendMetric = {
  keyword: string
  searchHeat: number
  noteCount: number
  growthRate: number
  engagementRate: number
  competitorCount: number
}

export type Opportunity = TrendMetric & {
  score: number
  risk: 'low' | 'medium' | 'high'
  demandSupplyRatio: number
  signals: string[]
  scoreBreakdown: {
    demandSupply: number
    growth: number
    engagement: number
    competition: number
  }
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 2) => Number(value.toFixed(digits))

export function analyzeOpportunities(metrics: TrendMetric[]): Opportunity[] {
  const results = metrics.map(metric => {
    const values = [metric.searchHeat, metric.noteCount, metric.growthRate, metric.engagementRate, metric.competitorCount]
    if (!metric.keyword.trim() || values.some(value => !Number.isFinite(value)) || metric.searchHeat < 0 || metric.noteCount < 0 || metric.competitorCount < 0 || metric.engagementRate < 0) {
      throw new Error(`趋势数据无效：${metric.keyword || '未命名关键词'}`)
    }

    const demandSupplyRatio = metric.searchHeat / (metric.noteCount + 100)
    const demandSupply = clamp(Math.log1p(demandSupplyRatio) / Math.log(11))
    const growth = clamp((metric.growthRate + 0.2) / 0.8)
    const engagement = clamp(metric.engagementRate / 0.15)
    const competition = 1 - clamp(Math.log1p(metric.competitorCount) / Math.log(501))
    const score = round((demandSupply * 0.4 + growth * 0.25 + engagement * 0.2 + competition * 0.15) * 100, 1)
    const signals: string[] = []
    if (demandSupplyRatio >= 3) signals.push('需求供给比高')
    if (metric.growthRate >= 0.2) signals.push('近7日增长快')
    if (metric.engagementRate >= 0.08) signals.push('互动意愿强')
    if (metric.competitorCount <= 30) signals.push('直接竞品较少')
    if (demandSupplyRatio < 0.5 || metric.competitorCount >= 300) signals.push('供给或竞品偏多')

    return {
      ...metric,
      score,
      risk: score >= 65 ? 'low' as const : score >= 40 ? 'medium' as const : 'high' as const,
      demandSupplyRatio: round(demandSupplyRatio),
      signals,
      scoreBreakdown: {
        demandSupply: round(demandSupply * 40, 1),
        growth: round(growth * 25, 1),
        engagement: round(engagement * 20, 1),
        competition: round(competition * 15, 1),
      },
    }
  })
  return results.sort((a, b) => b.score - a.score)
}
