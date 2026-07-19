import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { mockProduct } from './features/products/mockProducts'

describe('App interactions', () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
  it('opens the product library from navigation', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '商品库' }))
    expect(screen.getByRole('heading', { name: '商品库' })).toBeInTheDocument()
  })

  it('switches the selected export specification', async () => {
    render(<App />)
    const detail = screen.getByRole('button', { name: /详情页长图 750px/ })
    await userEvent.click(detail)
    expect(detail).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the canvas zoom with toolbar buttons', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '放大画布' }))
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('opens saved creation records from navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '创作记录' }))
    expect(screen.getByRole('heading', { name: '创作记录' })).toBeInTheDocument()
  })

  it('switches between Xiaohongshu and Douyin platform copy', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '抖音' }))
    expect(screen.getByRole('button', { name: '抖音' })).toHaveAttribute('aria-pressed', 'true')
    expect((screen.getByLabelText('正文脚本') as HTMLTextAreaElement).value).toContain('【开场】')
  })

  it('continues editing a saved Douyin record in the workbench', async () => {
    const record = { id: 'r1', productId: null, productName: '青瓷杯', platform: '抖音', title: '历史标题', sellingPoints: ['历史卖点'], body: '历史口播正文', createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [record] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '创作记录' }))
    await userEvent.click(await screen.findByRole('button', { name: '继续创作' }))
    expect(screen.getByRole('heading', { name: '青瓷杯创作任务' })).toBeInTheDocument()
    expect(screen.getByLabelText('正文脚本')).toHaveValue('历史口播正文')
  })

  it('restores a locally auto-saved platform draft', () => {
    localStorage.setItem('zaowutai.creation-draft', JSON.stringify({ version: 1, platform: '小红书', product: { ...mockProduct, name: '自动草稿商品' }, content: { platform: '小红书', title: '自动恢复标题', sellingPoints: ['卖点'], body: '自动恢复正文', status: '待编辑' }, editingRecordId: null }))
    render(<App />)
    expect(screen.getByLabelText('生成标题')).toHaveValue('自动恢复标题')
    expect(screen.getByLabelText('正文脚本')).toHaveValue('自动恢复正文')
  })

  it('opens local AI settings from navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { mode: 'mock', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', hasApiKey: false, updatedAt: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(await screen.findByRole('heading', { name: 'AI 生成设置' })).toBeInTheDocument()
  })

  it('uses the local gateway when real AI mode is enabled', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'model', hasApiKey: true, updatedAt: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { title: 'AI 真实标题', sellingPoints: ['真实卖点'], body: 'AI 真实正文', source: 'ai' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '生成内容' }))
    expect(await screen.findByText('真实 AI 文案已生成')).toBeInTheDocument()
    expect(screen.getByLabelText('生成标题')).toHaveValue('AI 真实标题')
  })
})
