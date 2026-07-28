import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomerServicePage } from './CustomerServicePage'

describe('CustomerServicePage', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
      intent: { purpose: 'gift', recipient: '女朋友', holiday: '七夕', budgetMax: 200, destination: '杭州', deadline: '8月18日前', customization: { engraving: '小满', giftWrap: true }, requiresConfirmation: true, risks: [], autoSendAllowed: false, confidence: 0.98 },
      reply: '已记录您的送礼与定制需求。',
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'succeeded' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))))

  it('requires customization confirmation before automatic sending', async () => {
    render(<CustomerServicePage onNotice={vi.fn()}/>)
    await userEvent.clear(screen.getByLabelText('客户消息'))
    await userEvent.type(screen.getByLabelText('客户消息'), '送女朋友，七夕前到杭州，刻字小满')
    await userEvent.click(screen.getByRole('button', { name: '识别需求' }))

    expect(await screen.findByText('刻字：小满')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '自动发送' })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('我已核对定制内容与收货时效'))
    expect(screen.getByRole('button', { name: '自动发送' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: '自动发送' }))
    expect(fetch).toHaveBeenLastCalledWith('/api/automation/executions', expect.objectContaining({ method: 'POST' }))
  })
})
