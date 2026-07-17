import { useEffect, useState } from 'react'
import { Clipboard, FileText, Search, Trash2 } from 'lucide-react'
import { creationRecordsApi, type CreationRecord } from './creation-records.api'
import './creation-records.css'

export function CreationRecords() {
  const [records, setRecords] = useState<CreationRecord[]>([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')

  const load = async (search = query) => {
    try { setRecords((await creationRecordsApi.list(search)).data) } catch (error) { setMessage(error instanceof Error ? error.message : '创作记录加载失败') }
  }
  useEffect(() => { void load('') }, [])

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
    <form className="records-search" onSubmit={event => { event.preventDefault(); void load() }}><Search/><input aria-label="搜索创作记录" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索商品、标题或平台"/><button type="submit">搜索</button></form>
    {message && <div className="records-message" role="status">{message}<button onClick={() => setMessage('')}>×</button></div>}
    {records.length === 0 ? <div className="records-empty"><FileText/><h2>还没有创作记录</h2><p>回到今日工作台生成内容，然后点击“保存创作”。</p></div> : <div className="records-grid">{records.map(record => <article key={record.id}>
      <div className="record-meta"><span>{record.platform}</span><time>{new Date(record.updatedAt).toLocaleString('zh-CN')}</time></div>
      <h2>{record.title}</h2><p className="record-product">关联商品：{record.productName}</p>
      <ol>{record.sellingPoints.map((point, index) => <li key={index}>{point}</li>)}</ol>
      {record.body && <p className="record-body">{record.body}</p>}
      <footer><button onClick={() => void copy(record)}><Clipboard/>复制文案</button><button aria-label="删除创作记录" onClick={() => void remove(record)}><Trash2/></button></footer>
    </article>)}</div>}
  </section>
}
