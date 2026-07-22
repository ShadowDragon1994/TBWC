import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Database, Download, Lightbulb, Target, TrendingUp } from 'lucide-react'
import { demoPerformance } from '../analytics/performance'
import { performanceApi, type PerformanceRecord } from '../analytics/performance.api'
import { buildStrategy, strategyAsText } from './strategy'
import './strategy-page.css'

const icons = { 互动: TrendingUp, 转化: Target, 商品: Lightbulb }

export function StrategyPage({ onNotice }: { onNotice: (message: string) => void }) {
  const [saved, setSaved] = useState<PerformanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { void performanceApi.list().then(result => setSaved(result.data)).catch(error => onNotice(error instanceof Error ? error.message : '策略数据加载失败')).finally(() => setLoading(false)) }, [onNotice])
  const records = saved.length ? saved : demoPerformance
  const strategy = useMemo(() => buildStrategy(records), [records])
  const exportPlan = () => {
    const url = URL.createObjectURL(new Blob([strategyAsText(records)], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `内容策略-${new Date().toISOString().slice(0, 10)}.txt`; anchor.click(); URL.revokeObjectURL(url); onNotice('内容策略计划已导出')
  }
  return <section className="strategy-page"><header className="strategy-head"><div><p>从数据到下一步</p><h1>内容策略建议</h1><span>每条建议都带数据依据，并转化为可执行的发布动作。</span></div><button className="primary" onClick={exportPlan}><Download size={18}/>导出策略计划</button></header>
    {!saved.length && !loading && <div className="strategy-demo"><Database size={17}/>当前建议基于模拟数据；录入真实表现后将自动重新计算。</div>}
    <section className="strategy-focus"><div><ClipboardCheck size={20}/><span>下一周期重点</span></div><h2>{strategy.recommendations[2]?.title}</h2><p>{strategy.recommendations[2]?.action}</p></section>
    <div className="recommendation-grid">{strategy.recommendations.map(item => { const Icon = icons[item.type]; return <article key={item.type}><header><Icon size={19}/><span>{item.type}策略</span><em>{item.platform}</em></header><h2>{item.title}</h2><div><b>数据依据</b><p>{item.evidence}</p></div><div><b>下一步行动</b><p>{item.action}</p></div></article> })}</div>
    <section className="strategy-schedule"><header><div><h2>下周内容清单</h2><p>建议先按四条小样本执行，下周回填数据后再调整。</p></div><span>4 条内容</span></header><div className="schedule-head"><span>日期</span><span>平台</span><span>选题</span><span>核心目标</span></div>{strategy.schedule.map(item => <article key={item.day}><b>{item.day}</b><span className={item.platform === '抖音' ? 'douyin' : ''}>{item.platform}</span><strong>{item.topic}</strong><em>{item.goal}</em></article>)}</section>
  </section>
}
