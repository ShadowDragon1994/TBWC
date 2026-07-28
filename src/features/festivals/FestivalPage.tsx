import { useEffect, useState } from 'react'
import { BellRing, CalendarDays, TrendingUp } from 'lucide-react'
import './festival-page.css'
type Plan={name:string;date:string;daysRemaining:number;predictedViews:number;predictionInterval:{low:number;high:number};reminderLevel:'strong'|'prepare'|'normal'|'expired';milestones:string[]}
export function FestivalPage({onNotice}:{onNotice:(message:string)=>void}){
 const [plans,setPlans]=useState<Plan[]>([]),[mape,setMape]=useState<number|null>(null)
 useEffect(()=>{void fetch('/api/festivals').then(async r=>{if(!r.ok)throw new Error('节日日历加载失败');return r.json()}).then(r=>{setPlans(r.data);setMape(r.backtest.mape)}).catch(e=>onNotice(e instanceof Error?e.message:'加载失败'))},[onNotice])
 return <section className="festival-page"><header><div><p>年度营销节奏</p><h1>节日营销日历与流量预测</h1><span>提前30天进入强提醒，联动选品、备货、内容和发布排期。</span></div><em>模拟预测</em></header><div className="forecast-summary"><span><CalendarDays/>年度节点<b>{plans.length}</b></span><span><TrendingUp/>预测方法<b>历史基线 × 提升系数</b></span><span><BellRing/>回测误差<b>{mape===null?'暂无':`${mape}%`}</b></span></div><div className="festival-list">{plans.map(plan=><article className={plan.reminderLevel} key={plan.name}><div className="festival-date"><b>{plan.date.slice(5)}</b><span>{plan.daysRemaining<0?'已结束':`还有 ${plan.daysRemaining} 天`}</span></div><div><div className="festival-title"><h2>{plan.name}</h2>{plan.reminderLevel==='strong'&&<em>强提醒</em>}{plan.reminderLevel==='prepare'&&<em>准备期</em>}</div><p>预测曝光 <b>{plan.predictedViews.toLocaleString()}</b> · 区间 <b>{plan.predictionInterval.low.toLocaleString()}–{plan.predictionInterval.high.toLocaleString()}</b></p><ul>{plan.milestones.map(item=><li key={item}>{item}</li>)}</ul></div></article>)}</div></section>
}
