import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, RefreshCw, Sparkles } from 'lucide-react'
import { createOpportunityBrief, opportunitiesApi, type Opportunity, type OpportunityBrief } from './opportunities.api'
import './opportunity-page.css'

export function OpportunityPage({ onCreateBrief, onNotice }: { onCreateBrief: (brief: OpportunityBrief) => void; onNotice: (message: string) => void }) {
  const [items, setItems] = useState<Opportunity[]>([])
  const [simulated, setSimulated] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await opportunitiesApi.list()
      setItems(result.data)
      setSimulated(result.meta.simulated)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '趋势机会加载失败')
    } finally {
      setLoading(false)
    }
  }, [onNotice])

  useEffect(() => { void load() }, [load])

  return <section className="opportunity-page">
    <header className="opportunity-head">
      <div><p>小红书趋势雷达</p><h1>蓝海选品机会</h1><span>需求供给 40% · 增长 25% · 互动 20% · 竞争 15%</span></div>
      <div>{simulated && <em>模拟趋势数据</em>}<button className="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={17}/>重新采集</button></div>
    </header>
    <div className="opportunity-note">当前数据用于功能开发与流程验证，不代表小红书真实热度。接入 RPA/MCP 后只替换采集适配器，评分和页面保持不变。</div>
    {loading ? <div className="opportunity-empty">正在分析趋势…</div> : <div className="opportunity-grid">{items.map(item => <article key={item.keyword}>
      <div className="opportunity-score"><strong>{item.score}</strong><span>机会分</span></div>
      <div className="opportunity-title"><div><h2>{item.keyword}</h2><p>{item.signals.join(' · ')}</p></div><span className={`risk ${item.risk}`}>{item.risk === 'low' ? '低风险' : item.risk === 'medium' ? '中风险' : '高风险'}</span></div>
      <div className="opportunity-metrics"><span>搜索热度<b>{item.searchHeat.toLocaleString()}</b></span><span>相关笔记<b>{item.noteCount.toLocaleString()}</b></span><span>7日增长<b>{Math.round(item.growthRate * 100)}%</b></span><span>互动率<b>{(item.engagementRate * 100).toFixed(1)}%</b></span><span>直接竞品<b>{item.competitorCount}</b></span></div>
      <div className="score-parts">{Object.entries(item.scoreBreakdown).map(([key, value]) => <span key={key}>{({ demandSupply: '需求供给', growth: '增长', engagement: '互动', competition: '竞争' } as Record<string, string>)[key]} {value}</span>)}</div>
      <button className="primary" aria-label="生成差异化方案" onClick={() => { onCreateBrief(createOpportunityBrief(item)); onNotice(`已生成“${item.keyword}”差异化方案`) }}><Sparkles size={17}/>生成差异化方案<ArrowUpRight size={16}/></button>
    </article>)}</div>}
  </section>
}
