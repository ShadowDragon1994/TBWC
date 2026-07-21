import { useEffect, useState } from 'react'
import { Clipboard, FileText, Pencil, Search, Trash2 } from 'lucide-react'
import { creationRecordsApi, type CreationRecord, type CreationRecordSource } from './creation-records.api'
import './creation-records.css'

export function CreationRecords({ onContinue }: { onContinue: (record: CreationRecord) => void }) {
  const [records, setRecords] = useState<CreationRecord[]>([])
  const [query, setQuery] = useState('')
  const [productName, setProductName] = useState('')
  const [platform, setPlatform] = useState('')
  const [source, setSource] = useState<CreationRecordSource | ''>('')
  const [productNames, setProductNames] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const load = async (filters = { q: query, productName, platform, source }) => {
    try {
      const data = (await creationRecordsApi.list(filters)).data
      setRecords(data)
      if (!filters.productName && !filters.platform && !filters.source && !filters.q) setProductNames([...new Set(data.map(record => record.productName))])
    } catch (error) { setMessage(error instanceof Error ? error.message : '创作记录加载失败') }
  }
  useEffect(() => { void load({ q: '', productName: '', platform: '', source: '' }) }, [])

  const copy = async (record: CreationRecord) => {
    await navigator.clipboard.writeText(`${record.title}\n\n${record.sellingPoints.join('\n')}\n\n${record.body}`.trim())
    setMessage('文案已复制到剪贴板')
  }
  const remove = async (record: CreationRecord) => {
    if (!window.confirm(`确定删除“${record.title}”吗？`)) return
    await creationRecordsApi.remove(record.id)
    setMessage('创作记录已删除')
    await load()
  }

  return <section className="records-page">
    <header><div><h1>创作记录</h1><p>保存生成结果，随时搜索和复用历史文案。</p></div><span>共 {records.length} 条</span></header>
    <form className="records-search" onSubmit={event => { event.preventDefault(); void load() }}><label><Search/><input aria-label="搜索创作记录" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题或关键词"/></label><select aria-label="筛选商品" value={productName} onChange={event => setProductName(event.target.value)}><option value="">全部商品</option>{productNames.map(name => <option key={name}>{name}</option>)}</select><select aria-label="筛选平台" value={platform} onChange={event => setPlatform(event.target.value)}><option value="">全部平台</option><option>小红书</option><option>抖音</option></select><select aria-label="筛选来源" value={source} onChange={event => setSource(event.target.value as CreationRecordSource | '')}><option value="">全部来源</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="submit">筛选</button></form>
    {message && <div className="records-message" role="status">{message}<button onClick={() => setMessage('')}>×</button></div>}
    {records.length === 0 ? <div className="records-empty"><FileText/><h2>还没有创作记录</h2><p>回到今日工作台生成内容，然后点击“保存创作”。</p></div> : <div className="records-grid">{records.map(record => <article key={record.id}>
      <div className="record-meta"><div><span>{record.platform}</span><b>V{record.versionNumber ?? 1}</b><em>{sourceLabels[record.source ?? 'manual']}</em><i className={`publish-state ${record.publishStatus ?? 'draft'}`}>{publishStatusLabels[record.publishStatus ?? 'draft']}</i></div><time>{new Date(record.createdAt).toLocaleString('zh-CN')}</time></div>
      <h2>{record.title}</h2><p className="record-product">关联商品：{record.productName}</p>
      <ol>{record.sellingPoints.map((point, index) => <li key={index}>{point}</li>)}</ol>
      {record.body && <p className="record-body">{record.body}</p>}
      <footer><button className="continue" onClick={() => onContinue(record)}><Pencil/>恢复到工作台</button><button onClick={() => void copy(record)}><Clipboard/>复制文案</button><button aria-label="删除创作记录" onClick={() => void remove(record)}><Trash2/></button></footer>
    </article>)}</div>}
  </section>
}

const sourceLabels: Record<CreationRecordSource, string> = { generate: '生成候选', rewrite_title: '标题改写', rewrite_selling_points: '卖点改写', rewrite_body: '正文改写', manual: '手动保存' }
const publishStatusLabels = { draft: '草稿', ready: '可发布', published: '已发布' } as const
