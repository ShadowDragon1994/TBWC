import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpportunityPage } from './OpportunityPage'

const opportunities = [{
  keyword: '非遗漆扇礼盒',
  searchHeat: 16800,
  noteCount: 1250,
  growthRate: 0.48,
  engagementRate: 0.118,
  competitorCount: 22,
  score: 82.5,
  risk: 'low',
  demandSupplyRatio: 12.44,
  signals: ['需求供给比高', '近7日增长快'],
  scoreBreakdown: { demandSupply: 40, growth: 21.3, engagement: 15.7, competition: 5.5 },
}]

describe('OpportunityPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: opportunities,
      meta: { platform: '小红书', source: 'mock', simulated: true, collectedAt: '2026-07-28T00:00:00.000Z' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
  })

  it('shows source-labelled opportunity evidence and creates a differentiation brief', async () => {
    const onCreateBrief = vi.fn()
    render(<OpportunityPage onCreateBrief={onCreateBrief} onNotice={vi.fn()}/>)

    expect(await screen.findByText('非遗漆扇礼盒')).toBeInTheDocument()
    expect(screen.getByText('模拟趋势数据')).toBeInTheDocument()
    expect(screen.getByText('需求供给 40')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '生成差异化方案' }))
    await waitFor(() => expect(onCreateBrief).toHaveBeenCalledWith(expect.objectContaining({
      keyword: '非遗漆扇礼盒',
      titleDirection: expect.any(String),
      visualDirection: expect.any(String),
    })))
  })
})
