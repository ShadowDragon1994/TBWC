import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Archive, BarChart3, Box, CalendarDays, Check, ChevronDown, CircleHelp, Download, FileImage, Home, Image, Lightbulb, Lock, MessagesSquare, Radar, RefreshCw, Save, Settings, Sparkles, TriangleAlert } from 'lucide-react'
import productImage from './assets/bookmark-gift.png'
import { analyzePlatformContent, generateMockContent, type ContentPlatform } from './features/creation/creation'
import { mockProduct } from './features/products/mockProducts'
import { ProductLibrary } from './features/products/ProductLibrary'
import type { ProductRecord } from './features/products/products.api'
import { CreationRecords } from './features/creation-records/CreationRecords'
import { creationRecordsApi, type CreationRecord, type CreationRecordSource, type PublishStatus } from './features/creation-records/creation-records.api'
import { AiSettingsPage } from './features/ai/AiSettingsPage'
import { aiApi, type AiCallUsage, type AiSettings } from './features/ai/ai.api'
import { getBudgetStatus } from './features/ai/budget'
import { PublishPackagePanel } from './features/publishing/PublishPackagePanel'
import { TemplateStudio } from './features/templates/TemplateStudio'
import { PublishingBoard } from './features/publishing-tasks/PublishingBoard'
import { AnalyticsDashboard } from './features/analytics/AnalyticsDashboard'
import { StrategyPage } from './features/strategy/StrategyPage'
import { creativeTasksApi, isClosedCreativeTask, type CreativeTaskStatus } from './features/creative-tasks/creative-tasks.api'
import { applyComplianceDecision, canExport, runCompliance, type ComplianceStatus } from './features/compliance/compliance'
import { downloadExportBundle } from './features/export/export-bundle'
import { OpportunityPage } from './features/opportunities/OpportunityPage'
import { CustomerServicePage } from './features/customer-service/CustomerServicePage'
import { FestivalPage } from './features/festivals/FestivalPage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { AutomationStudio } from './features/automation/AutomationStudio'

const nav = [[Home, '今日工作台'], [Radar, '趋势选品'], [MessagesSquare, '客服助手'], [CalendarDays, '节日运营'], [BarChart3, '经营监控'], [Settings, '自动化中心'], [Box, '商品库'], [Archive, '创作记录'], [CalendarDays, '发布任务'], [BarChart3, '数据复盘'], [Lightbulb, '策略建议'], [Image, '模板与素材'], [Settings, '设置']] as const
const exportOptions = ['主图 800×800', '详情页长图 750px', '竖版海报 3:4']
const localDraftKey = 'zaowutai.creation-draft'

function readLocalDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(localDraftKey) ?? 'null') as Record<string, unknown> | null
    const product = draft?.product as Record<string, unknown> | undefined
    const content = draft?.content as Record<string, unknown> | undefined
    if (draft?.version !== 1 || (draft.platform !== '小红书' && draft.platform !== '抖音') || typeof product?.id !== 'string' || typeof product.name !== 'string' || typeof product.price !== 'number' || typeof content?.title !== 'string' || typeof content.body !== 'string' || !Array.isArray(content.sellingPoints) || !content.sellingPoints.every(point => typeof point === 'string')) return null
    return {
      platform: draft.platform as ContentPlatform,
      product: product as ProductRecord | typeof mockProduct,
      content: { platform: draft.platform as ContentPlatform, title: content.title, sellingPoints: content.sellingPoints as string[], body: content.body, status: '待编辑' as const },
      editingRecordId: typeof draft.editingRecordId === 'string' ? draft.editingRecordId : null,
    }
  } catch { return null }
}

export function App() {
  const [initialDraft] = useState(readLocalDraft)
  const [currentProduct, setCurrentProduct] = useState<ProductRecord | typeof mockProduct>(initialDraft?.product ?? mockProduct)
  const [variant, setVariant] = useState(0)
  const [content, setContent] = useState(() => initialDraft?.content ?? generateMockContent(mockProduct.id, 0))
  const [generating, setGenerating] = useState(false)
  const [exported, setExported] = useState(false)
  const [selectedNav, setSelectedNav] = useState('今日工作台')
  const [selectedExport, setSelectedExport] = useState(exportOptions[0])
  const [zoom, setZoom] = useState(50)
  const [template, setTemplate] = useState(0)
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState<ContentPlatform>(initialDraft?.platform ?? '小红书')
  const [editingRecordId, setEditingRecordId] = useState<string | null>(initialDraft?.editingRecordId ?? null)
  const [guidance, setGuidance] = useState('')
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  const [candidates, setCandidates] = useState<Array<ReturnType<typeof generateMockContent>>>([])
  const [creativeTaskId, setCreativeTaskId] = useState<string | null>(null)
  const [creativeTaskStatus, setCreativeTaskStatus] = useState<CreativeTaskStatus>('draft')
  const [lastAiUsage, setLastAiUsage] = useState<AiCallUsage | null>(null)
  const forbiddenTerms = useMemo(() => ('forbiddenTerms' in currentProduct ? currentProduct.forbiddenTerms ?? '' : '').split(/[，,、\n]/).map(term => term.trim()).filter(Boolean), [currentProduct])
  const quality = useMemo(() => analyzePlatformContent(platform, content.title, content.body, forbiddenTerms), [platform, content, forbiddenTerms])
  const [authorizationRecorded, setAuthorizationRecorded] = useState(false)
  const [complianceDecisions, setComplianceDecisions] = useState<Record<string, ComplianceStatus>>({})
  const complianceFindings = useMemo(() => runCompliance({ title: content.title, body: `${content.sellingPoints.join(' ')} ${content.body}`, authorizationRecorded, hasAiLabel: true }).map(item => ({ ...item, status: complianceDecisions[item.id] ?? item.status })), [content, authorizationRecorded, complianceDecisions])
  const allFindings = useMemo(() => [
    ...complianceFindings.map(item => ({ level: item.status === 'unresolved' && item.severity !== 'suggest' ? 'warning' as const : 'pass' as const, message: `${item.location}：${item.reason}` })),
    ...quality.findings,
  ], [complianceFindings, quality.findings])

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(localDraftKey, JSON.stringify({ version: 1, platform, product: currentProduct, content, editingRecordId })), 500)
    return () => window.clearTimeout(timer)
  }, [platform, currentProduct, content, editingRecordId])

  const saveSnapshot = (snapshot: typeof content, source: CreationRecordSource) => creationRecordsApi.create({
    productId: currentProduct.id === mockProduct.id ? null : currentProduct.id,
    productName: currentProduct.name,
    platform,
    title: snapshot.title,
    sellingPoints: snapshot.sellingPoints,
    body: snapshot.body,
    source,
  })
  const saveSnapshots = async (snapshots: Array<{ snapshot: typeof content; source: CreationRecordSource }>) => {
    const results = await Promise.allSettled(snapshots.map(item => saveSnapshot(item.snapshot, item.source)))
    return results.every(result => result.status === 'fulfilled')
  }
  const confirmAvailableBudget = async (settings: AiSettings) => {
    if (settings.mode !== 'real' || !settings.monthlyBudget) return true
    const { data } = await aiApi.usage()
    const status = getBudgetStatus(data.summary.estimatedCost, data.summary.monthlyBudget)
    if (status.level !== 'exceeded') return true
    return window.confirm(`本月 AI 费用已达到预算（¥${data.summary.estimatedCost.toFixed(4)} / ¥${data.summary.monthlyBudget.toFixed(2)}）。是否仍要继续生成？`)
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const settings = aiSettings ?? (await aiApi.settings()).data
      setAiSettings(settings)
      if (!await confirmAvailableBudget(settings)) { setNotice('已取消生成，本月 AI 预算不会继续增加'); return }
      const next = variant + 1
      setVariant(next)
      if (settings.mode === 'real') {
        const { data } = await aiApi.generate({ platform, product: { name: currentProduct.name, category: currentProduct.category, price: currentProduct.price, material: currentProduct.material, audience: currentProduct.audience, scene: currentProduct.scene, sellingPoints: 'sellingPoints' in currentProduct ? currentProduct.sellingPoints : '', forbiddenTerms: 'forbiddenTerms' in currentProduct ? currentProduct.forbiddenTerms : '' }, guidance, count: 3, operation: 'generate' })
        setLastAiUsage(data.usage ?? null)
        const options = data.candidates.map(candidate => ({ ...candidate, platform, status: '待编辑' as const }))
        setCandidates(options); setContent(options[0]); const saved = await saveSnapshots(options.map(option => ({ snapshot: option, source: 'generate' })))
        setNotice(saved ? '真实 AI 已生成 3 个候选版本，已自动保存' : '真实 AI 已生成 3 个候选版本；历史自动保存失败')
      } else {
        await new Promise(resolve => window.setTimeout(resolve, 650))
        const options = [0, 1, 2].map(offset => generateMockContent(currentProduct.id, next + offset, currentProduct.name, platform))
        setCandidates(options); setContent(options[0]); setVariant(next + 2); const saved = await saveSnapshots(options.map(option => ({ snapshot: option, source: 'generate' })))
        setNotice(saved ? '已生成 3 个模拟候选版本，已自动保存' : '已生成 3 个模拟候选版本；历史自动保存失败')
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : '内容生成失败') } finally { setGenerating(false) }
  }

  const rewrite = async (operation: 'rewrite_title' | 'rewrite_selling_points' | 'rewrite_body') => {
    setGenerating(true)
    try {
      const settings = aiSettings ?? (await aiApi.settings()).data
      setAiSettings(settings)
      if (!await confirmAvailableBudget(settings)) { setNotice('已取消改写，本月 AI 预算不会继续增加'); return }
      if (settings.mode === 'real') {
        const { data } = await aiApi.generate({ platform, product: { name: currentProduct.name, category: currentProduct.category, price: currentProduct.price, material: currentProduct.material, audience: currentProduct.audience, scene: currentProduct.scene }, guidance, operation, count: 1, currentContent: content })
        setLastAiUsage(data.usage ?? null)
        const updated = { ...content, ...(operation === 'rewrite_title' ? { title: data.title } : operation === 'rewrite_selling_points' ? { sellingPoints: data.sellingPoints } : { body: data.body }) }
        setContent(updated); await saveSnapshots([{ snapshot: updated, source: operation }])
      } else {
        const rewritten = generateMockContent(currentProduct.id, variant + 1, currentProduct.name, platform)
        setVariant(value => value + 1)
        const updated = { ...content, ...(operation === 'rewrite_title' ? { title: rewritten.title } : operation === 'rewrite_selling_points' ? { sellingPoints: rewritten.sellingPoints } : { body: rewritten.body }) }
        setContent(updated); await saveSnapshots([{ snapshot: updated, source: operation }])
      }
      setNotice(operation === 'rewrite_title' ? '标题已改写' : operation === 'rewrite_selling_points' ? '卖点已改写' : '正文已改写')
    } catch (error) { setNotice(error instanceof Error ? error.message : '局部改写失败') } finally { setGenerating(false) }
  }

  const exportBundle = async () => {
    if (!canExport(complianceFindings)) return setNotice('请先处理全部合规阻断项和确认项')
    setGenerating(true)
    const taskDraft = (status: CreativeTaskStatus, failureReason = '') => ({
      productId: currentProduct.id === mockProduct.id ? null : currentProduct.id,
      productName: currentProduct.name,
      platform,
      title: content.title,
      sellingPoints: content.sellingPoints,
      body: content.body,
      status,
      failureReason,
    })
    let taskId = creativeTaskId
    let status = creativeTaskStatus
    try {
      if (!taskId) {
        const created = await creativeTasksApi.create(taskDraft('draft'))
        taskId = created.data.id
        status = created.data.status
      }
      const advance = async (next: CreativeTaskStatus) => {
        const updated = await creativeTasksApi.update(taskId!, taskDraft(next))
        status = updated.data.status
        setCreativeTaskStatus(status)
      }
      if (status === 'failed') await advance('editing')
      if (status === 'draft') await advance('editing')
      if (status === 'editing') await advance('checking')
      if (status === 'checking') await advance('confirming')
      if (status === 'confirming') await advance('exporting')
      const imageUrl = 'assets' in currentProduct && currentProduct.assets?.[0]?.storedName ? `/uploads/${currentProduct.assets[0].storedName}` : productImage
      await downloadExportBundle({ productName: currentProduct.name, platform, title: content.title, sellingPoints: content.sellingPoints, body: content.body, imageUrl, findings: complianceFindings })
      await advance('completed')
      setCreativeTaskId(taskId)
      setExported(true)
      setNotice('多尺寸 PNG、文案和合规报告已打包导出')
    } catch (error) {
      if (taskId && status !== 'completed') {
        try { await creativeTasksApi.update(taskId, taskDraft('failed', error instanceof Error ? error.message : '导出失败')); setCreativeTaskStatus('failed') } catch { /* preserve original export error */ }
      }
      setNotice(error instanceof Error ? error.message : '素材包导出失败')
    } finally { setGenerating(false) }
  }

  const saveCreation = async () => {
    setSaving(true)
    try {
      const draft = {
        productId: currentProduct.id === mockProduct.id ? null : currentProduct.id,
        productName: currentProduct.name,
        platform,
        title: content.title,
        sellingPoints: content.sellingPoints,
        body: content.body,
        source: 'manual' as const,
      }
      const saved = await creationRecordsApi.create(draft)
      const taskDraft = { ...draft, status: 'editing' as const, failureReason: '' }
      const task = creativeTaskId && !isClosedCreativeTask(creativeTaskStatus)
        ? await creativeTasksApi.update(creativeTaskId, taskDraft)
        : await creativeTasksApi.create(taskDraft)
      setEditingRecordId(saved.data.id)
      setCreativeTaskId(task.data.id)
      setCreativeTaskStatus(task.data.status)
      setNotice('创作任务和历史版本已保存')
    } catch (error) { setNotice(error instanceof Error ? error.message : '保存创作记录失败') } finally { setSaving(false) }
  }

  const resumeCreativeTask = async () => {
    try {
      const tasks = (await creativeTasksApi.listActive()).data
      const task = tasks.find(item => item.status !== 'completed')
      if (!task) return setNotice('没有未完成的创作任务')
      setCurrentProduct({ ...mockProduct, id: task.productId ?? mockProduct.id, name: task.productName })
      setPlatform(task.platform)
      setContent({ platform: task.platform, title: task.title, sellingPoints: task.sellingPoints, body: task.body, status: '待编辑' })
      setCreativeTaskId(task.id)
      setCreativeTaskStatus(task.status)
      setSelectedNav('今日工作台')
      setNotice(`已恢复“${task.productName}”创作任务`)
    } catch (error) { setNotice(error instanceof Error ? error.message : '恢复创作任务失败') }
  }

  const savePublication = async (publishStatus: PublishStatus, publishedUrl = '') => {
    try {
      const saved = await creationRecordsApi.create({ productId: currentProduct.id === mockProduct.id ? null : currentProduct.id, productName: currentProduct.name, platform, title: content.title, sellingPoints: content.sellingPoints, body: content.body, source: 'manual' })
      await creationRecordsApi.updatePublication(saved.data.id, publishStatus, publishedUrl)
      setEditingRecordId(saved.data.id)
      setNotice(publishStatus === 'published' ? '已记录发布作品和链接' : '已保存为可发布版本')
    } catch (error) { setNotice(error instanceof Error ? error.message : '发布状态保存失败'); throw error }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="seal">造</span><strong>造物台</strong></div>
      <nav aria-label="主导航">{nav.map(([Icon, label]) => <button className={selectedNav === label ? 'active' : ''} key={label} onClick={() => { setSelectedNav(label); setNotice(label === '今日工作台' ? '已返回今日工作台' : '') }}><Icon size={20}/><span>{label}</span></button>)}</nav>
      <div className="side-note">个人模式<br/><small>数据保存在本机</small></div>
    </aside>

    <main className={selectedNav === '客服助手' ? 'customer-active' : selectedNav === '节日运营' ? 'festival-active' : selectedNav === '经营监控' ? 'inventory-active' : selectedNav === '自动化中心' ? 'automation-active' : ''}>
      <header className="topbar"><div/><button onClick={() => setNotice('可直接编辑文案；生成与导出目前使用模拟数据')}><CircleHelp size={17}/>使用帮助</button><span className="avatar">山</span></header>
      {selectedNav === '客服助手' && <CustomerServicePage onNotice={setNotice}/>}
      {selectedNav === '节日运营' && <FestivalPage onNotice={setNotice}/>}
      {selectedNav === '经营监控' && <InventoryPage onNotice={setNotice}/>}
      {selectedNav === '自动化中心' && <AutomationStudio onNotice={setNotice}/>}
      {selectedNav === '趋势选品' ? <OpportunityPage onNotice={setNotice} onCreateBrief={brief => { setCurrentProduct({ ...mockProduct, name: brief.keyword, sellingPoints: brief.contentAngles.join('；'), scene: brief.positioning }); setPlatform('小红书'); setContent({ platform: '小红书', title: brief.titleDirection, sellingPoints: brief.contentAngles, body: `${brief.positioning}\n\n视觉方向：${brief.visualDirection}`, status: '待编辑' }); setSelectedNav('今日工作台') }}/> : selectedNav === '商品库' ? <ProductLibrary onUse={product => { setCurrentProduct(product); setContent(generateMockContent(product.id, 0, product.name, platform)); setEditingRecordId(null); setVariant(0); setSelectedNav('今日工作台'); setNotice(`已选择“${product.name}”用于创作`) }}/> : selectedNav === '创作记录' ? <CreationRecords onContinue={(record: CreationRecord) => { const recordPlatform: ContentPlatform = record.platform === '抖音' ? '抖音' : '小红书'; setCurrentProduct({ ...mockProduct, id: record.productId ?? mockProduct.id, name: record.productName }); setPlatform(recordPlatform); setContent({ platform: recordPlatform, title: record.title, sellingPoints: record.sellingPoints, body: record.body, status: '待编辑' }); setEditingRecordId(null); setSelectedNav('今日工作台'); setNotice(`已恢复历史版本 V${record.versionNumber ?? 1}，保存时会创建新版本`) }}/> : selectedNav === '发布任务' ? <PublishingBoard onNotice={setNotice}/> : selectedNav === '数据复盘' ? <AnalyticsDashboard onNotice={setNotice}/> : selectedNav === '策略建议' ? <StrategyPage onNotice={setNotice}/> : selectedNav === '模板与素材' ? <TemplateStudio defaultTitle={content.title} onNotice={setNotice}/> : selectedNav === '设置' ? <AiSettingsPage onSaved={settings => setAiSettings(settings)}/> : <>
      <section className="page-head">
        <div><h1>{currentProduct.name}创作任务</h1><div className="steps"><span className="done"><Check/>选择商品</span><i/><span className="current">2</span><b>生成内容</b><i/><span>3</span><b>审核调整</b><i/><span>4</span><b>导出完成</b></div></div>
        <div className="head-actions"><div className="task-state">任务状态：<em>{generating ? '处理中' : exported ? '已导出' : creativeTaskStatus === 'draft' ? '草稿' : creativeTaskStatus === 'failed' ? '导出失败' : '待编辑'}</em>{lastAiUsage && <small>{lastAiUsage.model} · {lastAiUsage.latencyMs}ms · {lastAiUsage.estimatedCost === null ? '费用未知' : `¥${lastAiUsage.estimatedCost.toFixed(4)}`}</small>}</div><button className="secondary" onClick={() => void resumeCreativeTask()}><RefreshCw size={18}/>继续未完成任务</button><button className="primary" onClick={() => void generate()} disabled={generating}><Sparkles size={18}/>{generating ? '正在处理…' : '生成内容'}</button><button className="secondary" onClick={() => void saveCreation()} disabled={saving}><Save size={18}/>{saving ? '保存中…' : '保存创作'}</button><button className="secondary" onClick={() => void exportBundle()} disabled={generating || !canExport(complianceFindings)}><Download size={18}/>导出素材包</button></div>
      </section>

      <section className="workspace">
        <aside className="product-panel panel">
          <div className="panel-title">商品信息 <ChevronDown size={16}/></div>
          <div className="product-summary"><img src={'assets' in currentProduct && currentProduct.assets?.[0]?.storedName ? `/uploads/${currentProduct.assets[0].storedName}` : productImage} alt={currentProduct.name}/><div><strong>{currentProduct.name}</strong><b>¥{currentProduct.price.toFixed(2)}</b><small>材质：{currentProduct.material || '未填写'}</small></div></div>
          <div className="divider"/><h3>产品卖点与信息</h3>
          <Field label="材质" value={currentProduct.material || '未填写'}/><Field label="受众人群" value={currentProduct.audience || '未填写'}/><Field label="适用场景" value={currentProduct.scene || '未填写'}/><Field label="商品类目" value={currentProduct.category}/><Field label="价格" value={`${currentProduct.price.toFixed(2)} 元`}/>
          <button className="soft" onClick={() => setNotice('模拟商品信息已刷新')}><RefreshCw size={15}/>更新商品信息</button>
        </aside>

        <section className="canvas-panel panel">
          <div className="panel-title"><span>主图画布 <small>800×800</small></span><button onClick={() => { setTemplate(value => (value + 1) % 2); setNotice('已切换主图模板') }}>更换模板</button></div>
          <div className={`artboard template-${template}`}><img src={productImage} alt="主图预览"/><div className="art-title">{template === 0 ? <>花窗<br/>映心意</> : <>东方<br/>书香礼</>}</div><span className="art-tag">七夕礼赠</span><div className="art-footer"><b>花窗雅韵</b><span>胡桃木配黄铜</span><span>心意伴手礼</span></div></div>
          <div className="canvas-tools"><button aria-label="缩小画布" onClick={() => setZoom(value => Math.max(30, value - 10))}>−</button><span>{zoom}%</span><button aria-label="放大画布" onClick={() => setZoom(value => Math.min(100, value + 10))}>＋</button><button onClick={() => { setZoom(50); setNotice('画布已适应可视区域') }}>适应画布</button></div>
        </section>

        <aside className="editor-panel">
          <section className="panel copy-panel"><div className="panel-title">文案内容 <button className="plain-action" onClick={() => setLocked(value => !value)}><Lock size={14}/>{locked ? '全部解锁' : '全部锁定'}</button></div>
            <div className="platform-switch" aria-label="内容平台">{(['小红书', '抖音'] as ContentPlatform[]).map(option => <button key={option} aria-pressed={platform === option} onClick={() => { setPlatform(option); setVariant(0); setContent(generateMockContent(currentProduct.id, 0, currentProduct.name, option)); setNotice(`已切换为${option}文案结构`) }}>{option}</button>)}</div>
            {candidates.length > 1 && <div className="candidate-tabs" aria-label="候选版本">{candidates.map((candidate, index) => <button key={index} aria-pressed={candidate.title === content.title} onClick={() => setContent(candidate)}>版本 {index + 1}</button>)}</div>}
            <label>生成标题 <small>{content.title.length}/30</small></label><div className="editable"><input aria-label="生成标题" disabled={locked} value={content.title} onChange={event => setContent({...content, title:event.target.value})}/><Lock size={15}/></div><button className="regen" onClick={() => void rewrite('rewrite_title')}><RefreshCw size={14}/>只改写标题</button>
            <button className="regen" onClick={() => void generate()}><RefreshCw size={14}/>重新生成</button>
            <label>产品卖点 <small>{content.sellingPoints.length}/5</small></label>{content.sellingPoints.map((point, index) => <div className="editable point" key={index}><i>{index + 1}</i><input aria-label={`产品卖点 ${index + 1}`} disabled={locked} value={point} onChange={event => { const points=[...content.sellingPoints]; points[index]=event.target.value; setContent({...content,sellingPoints:points})}}/><Lock size={15}/></div>)}<button className="regen" onClick={() => void rewrite('rewrite_selling_points')}><RefreshCw size={14}/>只改写卖点</button>
            <label>{platform === '抖音' ? '口播脚本' : '正文笔记'} <small>{content.body.length}/10000</small></label><textarea aria-label="正文脚本" disabled={locked} value={content.body} onChange={event => setContent({...content, body:event.target.value})}/><button className="regen" onClick={() => void rewrite('rewrite_body')}><RefreshCw size={14}/>只改写正文</button>
            <label>补充要求 <small>{guidance.length}/1000</small></label><textarea className="guidance" aria-label="补充要求" disabled={locked} value={guidance} onChange={event => setGuidance(event.target.value)} placeholder="例如：语气自然、突出送老师场景"/>
          </section>
          <section className="panel compliance"><div className="panel-title">合规与内容质量 <span>{platform === '抖音' ? `约 ${quality.metrics.estimatedSeconds} 秒` : `${quality.metrics.topicCount} 个话题`}</span></div>
            <label className="authorization-check"><input type="checkbox" checked={authorizationRecorded} onChange={event => setAuthorizationRecorded(event.target.checked)}/>已核对图片与字体授权凭证</label>
            {complianceFindings.map(item => <div className={`compliance-finding ${item.severity} ${item.status}`} key={item.id}>{item.severity === 'block' || item.status === 'unresolved' ? <TriangleAlert/> : <Check/>}<span><b>{item.location} · {item.severity === 'block' ? '阻断' : item.severity === 'confirm' ? '需确认' : '建议'}</b>{item.reason}<small>{item.suggestion}</small></span>{item.severity !== 'block' && item.status === 'unresolved' && <button onClick={() => setComplianceDecisions(current => ({ ...current, [item.id]: applyComplianceDecision(item, 'accepted').status }))}>{item.severity === 'confirm' ? '确认继续' : '忽略建议'}</button>}</div>)}
            {quality.findings.map((finding, index) => <div className={finding.level} key={`quality-${index}`}>{finding.level === 'warning' ? <TriangleAlert/> : <Check/>}<span>{finding.message}</span></div>)}
          </section>
          <PublishPackagePanel platform={platform} title={content.title} sellingPoints={content.sellingPoints} body={content.body} findings={allFindings} onStatus={savePublication} onNotice={setNotice}/>
        </aside>
      </section>

      <footer className="export-bar"><strong>导出规格</strong>{exportOptions.map(title => <ExportOption key={title} icon={<FileImage/>} title={title} selected={selectedExport === title} onSelect={() => setSelectedExport(title)}/>)}<div className="export-status"><small>导出状态</small><b>{exported ? '已完成 3/3' : '准备就绪 0/3'}</b><div><span className={exported ? 'complete' : ''}/></div></div></footer>
      </>}
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    </main>
  </div>
}

function Field({label,value}:{label:string,value:string}) { return <label className="field"><span>{label}</span><div>{value}<Lock size={13}/></div></label> }
function ExportOption({icon,title,selected,onSelect}:{icon:ReactNode,title:string,selected?:boolean,onSelect:()=>void}) { return <button aria-pressed={selected} onClick={onSelect} className={`export-option ${selected?'selected':''}`}>{icon}<span><b>{title}</b><small>JPG · 自动适配</small></span>{selected&&<Check/>}</button> }
