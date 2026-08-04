export type Opportunity = {
  keyword: string
  searchHeat: number
  noteCount: number
  growthRate: number
  engagementRate: number
  competitorCount: number
  score: number
  risk: 'low' | 'medium' | 'high'
  demandSupplyRatio: number
  signals: string[]
  scoreBreakdown: { demandSupply: number; growth: number; engagement: number; competition: number }
}

export type OpportunityBrief = {
  keyword: string
  positioning: string
  titleDirection: string
  visualDirection: string
  contentAngles: string[]
}

export const opportunitiesApi = {
  async list() {
    const response = await fetch('/api/opportunities')
    if (!response.ok) throw new Error('趋势机会加载失败')
    return response.json() as Promise<{
      data: Opportunity[]
      meta: { platform: '小红书'; source: string; simulated: boolean; method?: string; collectedAt: string }
    }>
  },
  async listKeywords() {
    const response = await fetch('/api/opportunity-keywords')
    if (!response.ok) throw new Error('趋势种子词加载失败')
    return response.json() as Promise<{ data: string[] }>
  },
  async saveKeywords(keywords: string[]) {
    const response = await fetch('/api/opportunity-keywords', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords }),
    })
    if (!response.ok) throw new Error('趋势种子词保存失败')
    return response.json() as Promise<{ data: string[] }>
  },
}

export function createOpportunityBrief(opportunity: Opportunity): OpportunityBrief {
  return {
    keyword: opportunity.keyword,
    positioning: `围绕“${opportunity.keyword}”切入小众礼赠场景，避开同质化低价竞争`,
    titleDirection: `${opportunity.keyword}｜把东方心意装进一份不撞款的礼物`,
    visualDirection: '低饱和东方色、材质细节特写、送礼开箱与手写卡片三组画面',
    contentAngles: ['真实送礼场景', '工艺与材质细节', '定制过程', '预算与时效说明'],
  }
}
