import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarClock, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { creationRecordsApi, type CreationRecord } from '../creation-records/creation-records.api'
import { productsApi, type ProductRecord } from '../products/products.api'
import { publishingTasksApi, type PublishingTask, type PublishingTaskDraft, type PublishingTaskStatus } from './publishing-tasks.api'
import './publishing-tasks.css'

const columns: Array<[PublishingTaskStatus, string]> = [['editing', '编辑中'], ['review', '待审核'], ['ready', '可发布'], ['published', '已发布']]
const next: Partial<Record<PublishingTaskStatus, [PublishingTaskStatus, string]>> = { editing: ['review', '提交审核'], review: ['ready', '标记可发布'] }
const blank = (): PublishingTaskDraft => ({ productId: null, creationRecordId: null, productName: '', platform: '小红书', title: '', plannedAt: new Date(Date.now() + 86400000).toISOString(), notes: '', status: 'editing', publishedUrl: '' })
const localValue = (iso: string) => { const date = new Date(iso); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }

export function PublishingBoard({ onNotice }: { onNotice: (message: string) => void }) {
  const [tasks, setTasks] = useState<PublishingTask[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [records, setRecords] = useState<CreationRecord[]>([])
  const [platform, setPlatform] = useState('')
  const [productName, setProductName] = useState('')
  const [draft, setDraft] = useState<PublishingTaskDraft>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { void Promise.all([publishingTasksApi.list({ platform, productName }), productsApi.list(), creationRecordsApi.list()]).then(([a, b, c]) => { setTasks(a.data); setProducts(b.data); setRecords(c.data) }).catch(error => onNotice(error instanceof Error ? error.message : '发布任务加载失败')).finally(() => setLoading(false)) }, [platform, productName, onNotice])
  const stats = useMemo(() => ({ ready: tasks.filter(task => task.status === 'ready').length, due: tasks.filter(task => task.status !== 'published' && new Date(task.plannedAt) < new Date()).length }), [tasks])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const payload = { ...draft, plannedAt: new Date(draft.plannedAt).toISOString() }
      const result = editingId ? await publishingTasksApi.update(editingId, payload) : await publishingTasksApi.create(payload)
      setTasks(current => editingId ? current.map(task => task.id === editingId ? result.data : task) : [...current, result.data])
      setDraft(blank()); setEditingId(null); setShowForm(false); onNotice(editingId ? '发布任务已更新' : '发布任务已创建')
    } catch (error) { onNotice(error instanceof Error ? error.message : '发布任务保存失败') }
  }
  const update = async (task: PublishingTask, status: PublishingTaskStatus, publishedUrl = task.publishedUrl) => {
    try { const result = await publishingTasksApi.update(task.id, { ...task, status, publishedUrl }); setTasks(current => current.map(item => item.id === task.id ? result.data : item)); onNotice(status === 'published' ? '已记录发布作品' : '任务状态已更新') }
    catch (error) { onNotice(error instanceof Error ? error.message : '状态更新失败') }
  }
  const remove = async (task: PublishingTask) => { if (!window.confirm(`删除“${task.title}”？`)) return; await publishingTasksApi.remove(task.id); setTasks(current => current.filter(item => item.id !== task.id)); onNotice('发布任务已删除') }
  const chooseRecord = (id: string) => { const record = records.find(item => item.id === id); if (record) setDraft(current => ({ ...current, creationRecordId: record.id, productId: record.productId, productName: record.productName, platform: record.platform === '抖音' ? '抖音' : '小红书', title: record.title })) }

  return <section className="publishing-page">
    <header className="publishing-head"><div><p>内容发布排期</p><h1>发布任务</h1><span>把创作版本推进到真实作品，优先管理小红书与抖音。</span></div><button className="primary" onClick={() => { setDraft(blank()); setEditingId(null); setShowForm(true) }}><Plus size={18}/>新建发布任务</button></header>
    <div className="publishing-stats"><article><b>{tasks.length}</b><span>全部任务</span></article><article><b>{stats.ready}</b><span>等待发布</span></article><article className={stats.due ? 'danger' : ''}><b>{stats.due}</b><span>逾期任务</span></article><div className="publishing-filters"><label>平台<select aria-label="筛选发布平台" value={platform} onChange={event => setPlatform(event.target.value)}><option value="">全部平台</option><option>小红书</option><option>抖音</option></select></label><label>商品<input aria-label="筛选发布商品" value={productName} onChange={event => setProductName(event.target.value)} placeholder="搜索商品"/></label></div></div>
    {showForm && <form className="publishing-form" onSubmit={save}><div className="form-heading"><strong>{editingId ? '编辑发布任务' : '创建发布任务'}</strong><button type="button" onClick={() => setShowForm(false)}>取消</button></div><label>从创作记录带入<select aria-label="关联创作记录" value={draft.creationRecordId ?? ''} onChange={event => chooseRecord(event.target.value)}><option value="">不关联，手动填写</option>{records.map(record => <option key={record.id} value={record.id}>{record.productName} · V{record.versionNumber} · {record.title}</option>)}</select></label><div className="form-grid"><label>商品<select aria-label="任务商品" value={draft.productId ?? ''} onChange={event => { const product = products.find(item => item.id === event.target.value); setDraft(current => ({ ...current, productId: product?.id ?? null, productName: product?.name ?? current.productName })) }}><option value="">手动填写</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>商品名称<input required aria-label="任务商品名称" value={draft.productName} onChange={event => setDraft(current => ({ ...current, productName: event.target.value }))}/></label><label>平台<select aria-label="任务平台" value={draft.platform} onChange={event => setDraft(current => ({ ...current, platform: event.target.value as PublishingTaskDraft['platform'] }))}><option>小红书</option><option>抖音</option></select></label><label>计划发布时间<input required aria-label="计划发布时间" type="datetime-local" value={localValue(draft.plannedAt)} onChange={event => setDraft(current => ({ ...current, plannedAt: event.target.value }))}/></label></div><label>任务标题<input required aria-label="任务标题" value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}/></label><label>备注<textarea aria-label="任务备注" value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))}/></label><button className="primary" type="submit">{editingId ? '保存修改' : '创建任务'}</button></form>}
    {loading ? <div className="board-empty">正在加载发布任务…</div> : <div className="publishing-board">{columns.map(([status, label]) => <section className={`task-column ${status}`} key={status}><header><strong>{label}</strong><span>{tasks.filter(task => task.status === status).length}</span></header><div>{tasks.filter(task => task.status === status).map(task => <TaskCard key={task.id} task={task} link={links[task.id] ?? task.publishedUrl} onLink={value => setLinks(current => ({ ...current, [task.id]: value }))} onEdit={() => { setDraft({ ...task, plannedAt: localValue(task.plannedAt) }); setEditingId(task.id); setShowForm(true) }} onRemove={() => void remove(task)} onUpdate={update}/>) }{!tasks.some(task => task.status === status) && <div className="column-empty">暂无任务</div>}</div></section>)}</div>}
  </section>
}

function TaskCard({ task, link, onLink, onEdit, onRemove, onUpdate }: { task: PublishingTask; link: string; onLink: (value: string) => void; onEdit: () => void; onRemove: () => void; onUpdate: (task: PublishingTask, status: PublishingTaskStatus, url?: string) => void }) {
  const overdue = task.status !== 'published' && new Date(task.plannedAt) < new Date()
  return <article className="task-card"><div className="task-card-top"><span className={`platform ${task.platform === '抖音' ? 'douyin' : ''}`}>{task.platform}</span>{overdue && <em>已逾期</em>}<button aria-label={`编辑 ${task.title}`} onClick={onEdit}><Pencil size={14}/></button><button aria-label={`删除 ${task.title}`} onClick={onRemove}><Trash2 size={14}/></button></div><h3>{task.title}</h3><p>{task.productName}</p><time><CalendarClock size={14}/>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(task.plannedAt))}</time>{task.notes && <small>{task.notes}</small>}{next[task.status] && <button className="advance" onClick={() => onUpdate(task, next[task.status]![0])}>{next[task.status]![1]}</button>}{task.status === 'ready' && <div className="publish-action"><input aria-label={`${task.title} 发布链接`} value={link} onChange={event => onLink(event.target.value)} placeholder="https://作品链接"/><button disabled={!/^https:\/\//i.test(link)} onClick={() => onUpdate(task, 'published', link)}>记录已发布</button></div>}{task.status === 'published' && <a href={task.publishedUrl} target="_blank" rel="noreferrer">打开作品<ExternalLink size={14}/></a>}</article>
}
