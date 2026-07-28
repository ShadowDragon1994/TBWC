import { fireEvent, render, screen } from '@testing-library/react'
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

  it('opens the cover template studio and saves a local brand preset', async () => {
    const product = { id: 'p1', name: '真实商品', category: '文创', price: 39, assets: [{ id: 'a1', filename: 'real.png', storedName: 'asset.png' }], createdAt: '', updatedAt: '' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [product] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '模板与素材' }))
    expect(screen.getByRole('heading', { name: '模板与素材' })).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('品牌名称'))
    await userEvent.type(screen.getByLabelText('品牌名称'), '山海小店')
    await userEvent.click(screen.getByRole('button', { name: '保存品牌预设' }))
    expect(JSON.parse(localStorage.getItem('zaowutai.brand-preset') ?? '{}').brandName).toBe('山海小店')
    await userEvent.click(screen.getByRole('button', { name: '抖音封面' }))
    expect(screen.getByText('1080 × 1920')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '选择素材 real.png' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '选择素材 real.png' }))
    expect(screen.getByAltText('当前封面素材')).toHaveAttribute('src', '/uploads/asset.png')
    fireEvent.change(screen.getByRole('slider', { name: '素材缩放' }), { target: { value: '135' } })
    expect(localStorage.getItem('zaowutai.cover-layouts')).toContain('135')
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

  it('opens the publishing board and advances a task for review', async () => {
    const task = { id: '11111111-1111-4111-8111-111111111111', productId: null, creationRecordId: null, productName: '青瓷杯', platform: '小红书', title: '七夕青瓷笔记', plannedAt: '2026-07-23T02:00:00.000Z', notes: '', status: 'editing', publishedUrl: '', actualPublishedAt: null, createdAt: '', updatedAt: '' }
    const fetchMock = vi.fn().mockImplementation((input: string, options?: RequestInit) => {
      if (input.startsWith('/api/publishing-tasks') && options?.method === 'PUT') return Promise.resolve(new Response(JSON.stringify({ data: { ...task, status: 'review' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      return Promise.resolve(new Response(JSON.stringify({ data: input.startsWith('/api/publishing-tasks') ? [task] : [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '发布任务' }))
    expect(await screen.findByRole('heading', { name: '发布任务' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: '提交审核' }))
    expect(await screen.findByRole('button', { name: '标记可发布' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`/api/publishing-tasks/${task.id}`, expect.objectContaining({ method: 'PUT' }))
  })

  it('automatically publishes a ready Xiaohongshu task from the publishing board', async () => {
    const task = { id: '11111111-1111-4111-8111-111111111111', productId: null, creationRecordId: null, productName: '青瓷杯', platform: '小红书', title: '七夕青瓷笔记', plannedAt: '2026-07-23T02:00:00.000Z', notes: '', status: 'ready', publishedUrl: '', actualPublishedAt: null, createdAt: '', updatedAt: '' }
    const published = { ...task, status: 'published', publishedUrl: 'https://www.xiaohongshu.com/explore/mock-note' }
    const fetchMock = vi.fn().mockImplementation((input: string, options?: RequestInit) => {
      if (input === `/api/publishing-tasks/${task.id}/auto-publish` && options?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ data: { task: published, execution: { id: 'run-1', status: 'succeeded', externalUrl: published.publishedUrl } } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(new Response(JSON.stringify({ data: input.startsWith('/api/publishing-tasks') ? [task] : [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '发布任务' }))
    await userEvent.click(await screen.findByRole('button', { name: '自动发布到小红书' }))

    expect(await screen.findByRole('link', { name: '打开作品' })).toHaveAttribute('href', published.publishedUrl)
    expect(fetchMock).toHaveBeenCalledWith(`/api/publishing-tasks/${task.id}/auto-publish`, { method: 'POST' })
  })

  it('opens the analytics dashboard with clearly labelled demo data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '数据复盘' }))
    expect(await screen.findByRole('heading', { name: '数据复盘' })).toBeInTheDocument()
    expect(screen.getByText(/当前展示模拟数据/)).toBeInTheDocument()
    expect(screen.getByText('平台表现对比')).toBeInTheDocument()
  })

  it('previews and imports a valid performance CSV batch', async () => {
    const imported = { id: 'csv-record', publishingTaskId: null, productName: 'CSV商品', platform: '抖音', title: 'CSV导入作品', recordedOn: '2026-07-25', impressions: 1000, views: 800, likes: 60, favorites: 30, comments: 8, shares: 5, leads: 3, orders: 2, revenue: 199, createdAt: '', updatedAt: '' }
    const fetchMock = vi.fn().mockImplementation((input: string, options?: RequestInit) => {
      if (input === '/api/performance-records/import' && options?.method === 'POST') return Promise.resolve(new Response(JSON.stringify({ data: { created: 1, skipped: 0, records: [imported] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '数据复盘' }))
    await userEvent.click(await screen.findByRole('button', { name: '导入 CSV' }))
    const csv = '平台,商品名称,作品标题,统计日期,曝光量,播放阅读,点赞,收藏,评论,分享,线索,订单,成交额\n抖音,CSV商品,CSV导入作品,2026-07-25,1000,800,60,30,8,5,3,2,199'
    await userEvent.upload(screen.getByLabelText('选择 CSV 文件'), new File([csv], 'douyin.csv', { type: 'text/csv' }))
    expect(await screen.findByText('共 1 条，显示前 5 条')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '确认导入 1 条' }))
    expect(await screen.findByText('CSV导入作品')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/performance-records/import', expect.objectContaining({ method: 'POST' }))
  })

  it('opens evidence-based strategy recommendations', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, options?: RequestInit) => {
      if (input === '/api/publishing-tasks' && options?.method === 'POST') {
        const draft = JSON.parse(String(options.body))
        return Promise.resolve(new Response(JSON.stringify({ data: { ...draft, id: 'new-task', actualPublishedAt: null, createdAt: '', updatedAt: '' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '策略建议' }))
    expect(await screen.findByRole('heading', { name: '内容策略建议' })).toBeInTheDocument()
    expect(screen.getAllByText('数据依据')).toHaveLength(3)
    expect(screen.getByText('下周内容清单')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: '创建任务' })[0])
    expect(await screen.findByRole('button', { name: '已创建' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledWith('/api/publishing-tasks', expect.objectContaining({ method: 'POST' }))
  })

  it('filters version history by product, platform and source', async () => {
    const record = { id: 'r2', productId: null, productName: '青瓷杯', platform: '小红书', title: '版本标题', sellingPoints: ['卖点'], body: '正文', source: 'generate', versionNumber: 3, createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z' }
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data: [record] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '创作记录' }))
    expect(await screen.findByText('V3')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('筛选商品'), '青瓷杯')
    await userEvent.selectOptions(screen.getByLabelText('筛选平台'), '小红书')
    await userEvent.selectOptions(screen.getByLabelText('筛选来源'), 'generate')
    await userEvent.click(screen.getByRole('button', { name: '筛选' }))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/creation-records?productName=%E9%9D%92%E7%93%B7%E6%9D%AF&platform=%E5%B0%8F%E7%BA%A2%E4%B9%A6&source=generate', undefined)
  })

  it('switches between Xiaohongshu and Douyin platform copy', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '抖音' }))
    expect(screen.getByRole('button', { name: '抖音' })).toHaveAttribute('aria-pressed', 'true')
    expect((screen.getByLabelText('正文脚本') as HTMLTextAreaElement).value).toContain('【开场】')
  })

  it('previews a platform publish package and blocks readiness while warnings remain', async () => {
    render(<App />)
    expect(screen.getByText('笔记发布包')).toBeInTheDocument()
    await userEvent.click(screen.getByText('预览完整发布包'))
    expect(screen.getByText(/## 话题标签/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存为可发布' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '抖音' }))
    expect(screen.getByText(/4 段分镜/)).toBeInTheDocument()
  })

  it('shows actionable compliance findings and records user confirmations', async () => {
    render(<App />)
    expect(screen.getAllByText(/需确认/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/限量描述需要库存或活动依据/).length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByRole('button', { name: '确认继续' })[0])
    expect(screen.getAllByText(/需确认/).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('checkbox', { name: '已核对图片与字体授权凭证' }))
    expect(screen.queryByText('尚未记录图片与字体授权凭证')).not.toBeInTheDocument()
  })

  it('keeps ZIP export blocked until all compliance confirmations are handled', async () => {
    render(<App />)
    const exportButton = screen.getByRole('button', { name: '导出素材包' })
    expect(exportButton).toBeDisabled()
    for (const button of screen.getAllByRole('button', { name: '确认继续' })) await userEvent.click(button)
    await userEvent.click(screen.getByRole('checkbox', { name: '已核对图片与字体授权凭证' }))
    expect(exportButton).toBeEnabled()
  })

  it('continues editing a saved Douyin record in the workbench', async () => {
    const record = { id: 'r1', productId: null, productName: '青瓷杯', platform: '抖音', title: '历史标题', sellingPoints: ['历史卖点'], body: '历史口播正文', createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [record] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '创作记录' }))
    await userEvent.click(await screen.findByRole('button', { name: '恢复到工作台' }))
    expect(screen.getByRole('heading', { name: '青瓷杯创作任务' })).toBeInTheDocument()
    expect(screen.getByLabelText('正文脚本')).toHaveValue('历史口播正文')
  })

  it('restores a locally auto-saved platform draft', () => {
    localStorage.setItem('zaowutai.creation-draft', JSON.stringify({ version: 1, platform: '小红书', product: { ...mockProduct, name: '自动草稿商品' }, content: { platform: '小红书', title: '自动恢复标题', sellingPoints: ['卖点'], body: '自动恢复正文', status: '待编辑' }, editingRecordId: null }))
    render(<App />)
    expect(screen.getByLabelText('生成标题')).toHaveValue('自动恢复标题')
    expect(screen.getByLabelText('正文脚本')).toHaveValue('自动恢复正文')
  })

  it('saves and resumes a persisted creative task', async () => {
    const task = { id: 'task-1', productId: null, productName: '青瓷杯', platform: '抖音', title: '已保存标题', sellingPoints: ['已保存卖点'], body: '已保存正文', status: 'editing', failureReason: '', createdAt: '', updatedAt: '' }
    const fetchMock = vi.fn().mockImplementation((input: string, options?: RequestInit) => {
      if (input === '/api/creative-tasks' && options?.method === 'POST') return Promise.resolve(new Response(JSON.stringify({ data: task }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      if (input === '/api/creative-tasks') return Promise.resolve(new Response(JSON.stringify({ data: [task] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      return Promise.resolve(new Response(JSON.stringify({ data: { id: 'record-1', versionNumber: 1 } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '保存创作' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/creative-tasks', expect.objectContaining({ method: 'POST' }))
    await userEvent.click(screen.getByRole('button', { name: '继续未完成任务' }))
    expect(await screen.findByLabelText('生成标题')).toHaveValue('已保存标题')
    expect(screen.getByLabelText('正文脚本')).toHaveValue('已保存正文')
  })

  it('opens local AI settings from navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { mode: 'mock', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', hasApiKey: false, updatedAt: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(await screen.findByRole('heading', { name: 'AI 生成设置' })).toBeInTheDocument()
  })

  it('shows AI usage, budget progress and saves configurable token prices', async () => {
    const settings = { mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'model', hasApiKey: true, inputPricePerMillion: 2, outputPricePerMillion: 8, monthlyBudget: 10, updatedAt: null }
    const usage = { summary: { calls: 4, successfulCalls: 3, inputTokens: 1200, outputTokens: 600, estimatedCost: 2.5, unknownUsageCalls: 1, monthlyBudget: 10 }, records: [] }
    const fetchMock = vi.fn().mockImplementation((input: string, options?: RequestInit) => {
      if (input === '/api/ai/usage') return Promise.resolve(new Response(JSON.stringify({ data: usage }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      if (input === '/api/ai/settings' && options?.method === 'PUT') return Promise.resolve(new Response(JSON.stringify({ data: settings }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      return Promise.resolve(new Response(JSON.stringify({ data: settings }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(await screen.findByText('本月 AI 用量')).toBeInTheDocument()
    expect(screen.getByText('¥2.5000')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('输入 Token 单价'))
    await userEvent.type(screen.getByLabelText('输入 Token 单价'), '3')
    await userEvent.click(screen.getByRole('button', { name: '保存设置' }))
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url, options]) => url === '/api/ai/settings' && options?.method === 'PUT')?.[1]?.body)).inputPricePerMillion).toBe(3)
  })

  it('filters AI usage records by platform and result', async () => {
    const settings = { mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'model', hasApiKey: true, inputPricePerMillion: 2, outputPricePerMillion: 8, monthlyBudget: 10, updatedAt: null }
    const records = [
      { id: '1', operation: 'generate', platform: '小红书', model: 'model', inputTokens: 100, outputTokens: 50, latencyMs: 500, estimatedCost: 0.001, success: true, errorMessage: '', createdAt: '2026-07-25T01:00:00.000Z' },
      { id: '2', operation: 'rewrite_title', platform: '抖音', model: 'model', inputTokens: null, outputTokens: null, latencyMs: 800, estimatedCost: null, success: false, errorMessage: '服务超时', createdAt: '2026-07-25T02:00:00.000Z' },
    ]
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => Promise.resolve(new Response(JSON.stringify(input === '/api/ai/usage'
      ? { data: { summary: { calls: 2, successfulCalls: 1, inputTokens: 100, outputTokens: 50, estimatedCost: 0.001, unknownUsageCalls: 1, monthlyBudget: 10 }, records } }
      : { data: settings }), { status: 200, headers: { 'Content-Type': 'application/json' } }))))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(await screen.findByText('服务超时')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('调用平台'), '小红书')
    expect(screen.getByText(/小红书 · 生成内容/)).toBeInTheDocument()
    expect(screen.queryByText('服务超时')).not.toBeInTheDocument()
  })

  it('uses the local gateway when real AI mode is enabled', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'model', hasApiKey: true, updatedAt: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { title: 'AI 真实标题', sellingPoints: ['真实卖点'], body: 'AI 真实正文', source: 'ai', usage: { model: 'model', inputTokens: 1000, outputTokens: 500, latencyMs: 850, estimatedCost: 0.006 }, candidates: [{ title: 'AI 真实标题', sellingPoints: ['真实卖点'], body: 'AI 真实正文' }, { title: '候选二', sellingPoints: ['卖点二'], body: '正文二' }, { title: '候选三', sellingPoints: ['卖点三'], body: '正文三' }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '生成内容' }))
    expect(await screen.findByText(/真实 AI 已生成 3 个候选版本/)).toBeInTheDocument()
    expect(screen.getByLabelText('生成标题')).toHaveValue('AI 真实标题')
    expect(screen.getByText('model · 850ms · ¥0.0060')).toBeInTheDocument()
  })

  it('requires confirmation before a real AI call after the monthly budget is reached', async () => {
    const settings = { mode: 'real', baseUrl: 'https://api.example.com/v1', model: 'model', hasApiKey: true, inputPricePerMillion: 2, outputPricePerMillion: 8, monthlyBudget: 10, updatedAt: null }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: settings }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { summary: { calls: 5, successfulCalls: 5, inputTokens: 1000, outputTokens: 500, estimatedCost: 10, unknownUsageCalls: 0, monthlyBudget: 10 }, records: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '生成内容' }))
    expect(await screen.findByText('已取消生成，本月 AI 预算不会继续增加')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('offers three mock candidates and rewrites only the selected section', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { mode: 'mock', baseUrl: 'https://api.openai.com/v1', model: 'model', hasApiKey: false, updatedAt: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValue(new Response(JSON.stringify({ data: { id: 'history-id', versionNumber: 1 } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '生成内容' }))
    expect(await screen.findByRole('button', { name: '版本 3' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/creation-records')).toHaveLength(3)
    const bodyBefore = (screen.getByLabelText('正文脚本') as HTMLTextAreaElement).value
    const titleBefore = (screen.getByLabelText('生成标题') as HTMLInputElement).value
    await userEvent.click(screen.getByRole('button', { name: '只改写标题' }))
    expect(await screen.findByText('标题已改写')).toBeInTheDocument()
    expect(screen.getByLabelText('生成标题')).not.toHaveValue(titleBefore)
    expect(screen.getByLabelText('正文脚本')).toHaveValue(bodyBefore)
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/creation-records')).toHaveLength(4)
  })
})
