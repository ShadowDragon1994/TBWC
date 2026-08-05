import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, RefreshCw, Settings2, Sparkles } from 'lucide-react'
import { createOpportunityBrief, opportunitiesApi, type Opportunity, type OpportunityBrief } from './opportunities.api'
import './opportunity-page.css'

export function OpportunityPage({ onCreateBrief, onNotice }: { onCreateBrief: (brief: OpportunityBrief) => void; onNotice: (message: string) => void }) {
  const [items, setItems] = useState<Opportunity[]>([])
  const [simulated, setSimulated] = useState(false)
  const [sourceMethod, setSourceMethod] = useState('')
  const [cached, setCached] = useState(false)
  const [collectedAt, setCollectedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [keywordText, setKeywordText] = useState('')
  const [savingKeywords, setSavingKeywords] = useState(false)

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const result = await opportunitiesApi.list(refresh)
      setItems(result.data)
      setSimulated(result.meta.simulated)
      setSourceMethod(result.meta.method ?? '')
      setCached(result.meta.cached === true)
      setCollectedAt(result.meta.collectedAt)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '趋势机会加载失败')
    } finally {
      setLoading(false)
    }
  }, [onNotice])

  useEffect(() => { void load(false) }, [load])
  useEffect(() => {
    void opportunitiesApi.listKeywords().then(result => setKeywordText(result.data.join('\n'))).catch(error => onNotice(error instanceof Error ? error.message : '趋势种子词加载失败'))
  }, [onNotice])

  const saveKeywords = async () => {
    const keywords = [...new Set(keywordText.split(/\r?\n/).map(item => item.trim()).filter(Boolean))].slice(0, 10)
    if (!keywords.length) return onNotice('请至少填写一个趋势种子词')
    setSavingKeywords(true)
    try {
      const result = await opportunitiesApi.saveKeywords(keywords)
      setKeywordText(result.data.join('\n'))
      setConfigOpen(false)
      onNotice(`已保存 ${result.data.length} 个趋势种子词，正在重新采集`)
      await load(true)
    } catch (error) { onNotice(error instanceof Error ? error.message : '趋势种子词保存失败') }
    finally { setSavingKeywords(false) }
  }

  return <section className="opportunity-page">
    <header className="opportunity-head">
      <div><p>小红书趋势雷达</p><h1>蓝海选品机会</h1><span>需求供给 40% · 增长 25% · 互动 20% · 竞争 15%</span></div>
      <div>{simulated && <em>模拟趋势数据</em>}<button className="secondary" onClick={() => setConfigOpen(value => !value)}><Settings2 size={17}/>配置种子词</button><button className="secondary" onClick={() => void load(true)} disabled={loading}><RefreshCw size={17}/>重新采集</button></div>
    </header>
    {configOpen && <section className="keyword-config"><div><h2>趋势种子词</h2><p>每行一个，最多10个；保存后立即使用新词重新采集。</p></div><label><span>趋势种子词，每行一个</span><textarea aria-label="趋势种子词，每行一个" value={keywordText} onChange={event => setKeywordText(event.target.value)} rows={6}/></label><div className="keyword-actions"><button onClick={() => setConfigOpen(false)}>取消</button><button className="primary" disabled={savingKeywords} onClick={() => void saveKeywords()}>{savingKeywords ? '保存中…' : '保存并重新采集'}</button></div></section>}
    <div className="opportunity-note">{simulated ? '当前数据用于功能开发与流程验证，不代表小红书真实热度。配置 XHS_MCP_URL 后将自动切换真实搜索结果。' : `数据来自已登录的小红书 MCP；${sourceMethod || '指标根据搜索结果计算'}；${cached ? '当前展示最近缓存' : '当前展示本次采集'}${collectedAt ? `（${new Date(collectedAt).toLocaleString('zh-CN')}）` : ''}。`}</div>
    {loading ? <div className="opportunity-empty">正在分析趋势…</div> : <div className="opportunity-grid">{items.map(item => <article key={item.keyword}>
      <div className="opportunity-score"><strong>{item.score}</strong><span>机会分</span></div>
      <div className="opportunity-title"><div><h2>{item.keyword}</h2><p>{item.signals.join(' · ')}</p></div><span className={`risk ${item.risk}`}>{item.risk === 'low' ? '低风险' : item.risk === 'medium' ? '中风险' : '高风险'}</span></div>
      <div className="opportunity-metrics"><span>搜索热度<b>{item.searchHeat.toLocaleString()}</b></span><span>相关笔记<b>{item.noteCount.toLocaleString()}</b></span><span>7日增长<b>{Math.round(item.growthRate * 100)}%</b></span><span>互动率<b>{(item.engagementRate * 100).toFixed(1)}%</b></span><span>直接竞品<b>{item.competitorCount}</b></span></div>
      <div className="score-parts">{Object.entries(item.scoreBreakdown).map(([key, value]) => <span key={key}>{({ demandSupply: '需求供给', growth: '增长', engagement: '互动', competition: '竞争' } as Record<string, string>)[key]} {value}</span>)}</div>
      <button className="primary" aria-label="生成差异化方案" onClick={() => { onCreateBrief(createOpportunityBrief(item)); onNotice(`已生成“${item.keyword}”差异化方案`) }}><Sparkles size={17}/>生成差异化方案<ArrowUpRight size={16}/></button>
    </article>)}</div>}
  </section>
}
