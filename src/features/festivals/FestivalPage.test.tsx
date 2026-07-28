import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FestivalPage } from './FestivalPage'

describe('FestivalPage', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    data: [{ name: '七夕', date: '2026-08-19', daysRemaining: 22, predictedViews: 22200, predictionInterval: { low: 18204, high: 26196 }, reminderLevel: 'strong', milestones: ['启动选品与备货', '完成首轮内容素材'] }],
    backtest: { mape: 6.1, samples: 3 }, meta: { source: 'mock', simulated: true, method: '历史基线 × 节日提升系数' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }))))

  it('shows a strong 30-day reminder and forecast evidence', async () => {
    render(<FestivalPage onNotice={vi.fn()}/>)
    expect(await screen.findByText('七夕')).toBeInTheDocument()
    expect(screen.getByText('强提醒')).toBeInTheDocument()
    expect(screen.getByText('18,204–26,196')).toBeInTheDocument()
    expect(screen.getByText('6.1%')).toBeInTheDocument()
    expect(screen.getByText('模拟预测')).toBeInTheDocument()
  })
})
