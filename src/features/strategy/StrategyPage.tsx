import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check, ClipboardCheck, Database, Download, Lightbulb, Target, TrendingUp } from 'lucide-react'
import { demoPerformance } from '../analytics/performance'
import { performanceApi, type PerformanceRecord } from '../analytics/performance.api'
import { publishingTasksApi, type PublishingTask } from '../publishing-tasks/publishing-tasks.api'
import { buildStrategy, scheduleToPublishingDraft, strategyAsText, taskMatchesSchedule, type StrategyScheduleItem } from './strategy'
import './strategy-page.css'

const icons = { 互动: TrendingUp, 转化: Target, 商品: Lightbulb }

export function StrategyPage({ onNotice }: { onNotice: (message: string) => void }) {
  const [saved, setSaved] = useState<PerformanceRecord[]>([])
  const [tasks, setTasks] = useState<PublishingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  useEffect(() => { void Promise.all([performanceApi.list(), publishingTasksApi.list()]).then(([performance, publishing]) => { setSaved(performance.data); setTasks(publishing.data) }).catch(error => onNotice(error instanceof Error ? error.message : '策略数据加载失败')).finally(() => setLoading(false)) }, [onNotice])
  const records = saved.length ? saved : demoPerformance
  const strategy = useMemo(() => buildStrategy(records), [records])
  const exportPlan = () => {
    const url = URL.createObjectURL(new Blob([strategyAsText(records)], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `内容策略-${new Date().toISOString().slice(0, 10)}.txt`; anchor.click(); URL.revokeObjectURL(url); onNotice('内容策略计划已导出')
  }
  const isCreated = (item: StrategyScheduleItem) => tasks.some(task => taskMatchesSchedule(task, item))
  const createTask = async (item: StrategyScheduleItem, silent = false) => {
    if (isCreated(item)) return true
    try {
      const result = await publishingTasksApi.create(scheduleToPublishingDraft(item))
      setTasks(current => [...current, result.data])
      if (!silent) onNotice(`已创建${item.day}发布任务`)
      return true
    } catch (error) { onNotice(error instanceof Error ? error.message : '发布任务创建失败'); return false }
  }
  const createAll = async () => {
    setCreating(true)
    const pending = strategy.schedule.filter(item => !isCreated(item))
    let completed = 0
    for (const item of pending) if (await createTask(item, true)) completed += 1
    setCreating(false)
    onNotice(completed ? `已创建 ${completed} 条下周发布任务` : '下周发布任务已全部创建')
  }
  return <section className="strategy-page"><header className="strategy-head"><div><p>从数据到下一步</p><h1>内容策略建议</h1><span>每条建议都带数据依据，并转化为可执行的发布动作。</span></div><button className="primary" onClick={exportPlan}><Download size={18}/>导出策略计划</button></header>
    {!saved.length && !loading && <div className="strategy-demo"><Database size={17}/>当前建议基于模拟数据；录入真实表现后将自动重新计算。</div>}
    <section className="strategy-focus"><div><ClipboardCheck size={20}/><span>下一周期重点</span></div><h2>{strategy.recommendations[2]?.title}</h2><p>{strategy.recommendations[2]?.action}</p></section>
    <div className="recommendation-grid">{strategy.recommendations.map(item => { const Icon = icons[item.type]; return <article key={item.type}><header><Icon size={19}/><span>{item.type}策略</span><em>{item.platform}</em></header><h2>{item.title}</h2><div><b>数据依据</b><p>{item.evidence}</p></div><div><b>下一步行动</b><p>{item.action}</p></div></article> })}</div>
    <section className="strategy-schedule"><header><div><h2>下周内容清单</h2><p>建议先按四条小样本执行，下周回填数据后再调整。</p></div><button className="batch-create" disabled={creating || strategy.schedule.every(isCreated)} onClick={() => void createAll()}><CalendarPlus size={16}/>{strategy.schedule.every(isCreated) ? '已全部创建' : creating ? '创建中…' : '一键生成发布任务'}</button></header><div className="schedule-head"><span>日期</span><span>平台</span><span>选题</span><span>核心目标</span><span>执行</span></div>{strategy.schedule.map(item => { const created = isCreated(item); return <article key={item.day}><b>{item.day}</b><span className={item.platform === '抖音' ? 'douyin' : ''}>{item.platform}</span><strong>{item.topic}</strong><em>{item.goal}</em><button className={created ? 'created' : ''} disabled={created || creating} onClick={() => void createTask(item)}>{created ? <><Check size={14}/>已创建</> : <><CalendarPlus size={14}/>创建任务</>}</button></article> })}</section>
  </section>
}
