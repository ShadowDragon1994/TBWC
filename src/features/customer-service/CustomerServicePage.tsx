import { useState } from 'react'
import { Send, ShieldCheck, Sparkles } from 'lucide-react'
import { customerServiceApi, type CustomerIntent } from './customer-service.api'
import './customer-service-page.css'
export function CustomerServicePage({onNotice}:{onNotice:(message:string)=>void}){
 const [message,setMessage]=useState('送给女朋友的七夕礼物，预算200以内，8月18日前到杭州，可以刻字“小满”并礼盒包装吗？'),[intent,setIntent]=useState<CustomerIntent|null>(null),[reply,setReply]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false)
 const analyze=async()=>{setBusy(true);setConfirmed(false);try{const r=await customerServiceApi.analyze(message);setIntent(r.data.intent);setReply(r.data.reply)}catch(e){onNotice(e instanceof Error?e.message:'识别失败')}finally{setBusy(false)}}
 const send=async()=>{setBusy(true);try{await customerServiceApi.send(reply);onNotice('模拟自动发送成功，已记录自动化审计')}catch(e){onNotice(e instanceof Error?e.message:'发送失败')}finally{setBusy(false)}}
 const canSend=Boolean(intent&&reply&&intent.risks.length===0&&(intent.autoSendAllowed||(intent.requiresConfirmation&&confirmed)))
 return <section className="cs-page"><header><div><p>小红书客服助手</p><h1>送礼意图与定制承接</h1><span>识别、核对并通过可替换适配器发送。</span></div><em>模拟会话</em></header><div className="cs-grid">
 <article><h2>客户消息</h2><textarea aria-label="客户消息" value={message} onChange={e=>setMessage(e.target.value)}/><button className="primary" onClick={()=>void analyze()} disabled={busy}><Sparkles size={17}/>识别需求</button></article>
 <article><h2>意图识别</h2>{intent?<><div className="intent-tags"><span>用途：{intent.purpose==='gift'?'送礼':'自用'}</span><span>对象：{intent.recipient||'待确认'}</span><span>节日：{intent.holiday||'无'}</span><span>预算：{intent.budgetMax?`¥${intent.budgetMax}`:'待确认'}</span><span>地区：{intent.destination||'待确认'}</span><span>时限：{intent.deadline||'待确认'}</span></div>{intent.risks.map(r=><p className="cs-risk" key={r}>{r} · 必须转人工</p>)}</>:<div className="cs-empty">等待识别</div>}</article>
 <article><h2>定制确认卡</h2>{intent?<><p>刻字：{intent.customization.engraving||'无/待补充'}</p><p>包装：{intent.customization.giftWrap?'礼盒包装':'普通包装'}</p><p>送达：{intent.deadline||'待确认'} · {intent.destination||'地址待确认'}</p>{intent.requiresConfirmation&&<label className="confirm"><input aria-label="我已核对定制内容与收货时效" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><ShieldCheck/>我已核对定制内容与收货时效</label>}</>:<div className="cs-empty">识别后生成</div>}</article>
 <article><h2>建议回复</h2><textarea aria-label="建议回复" value={reply} onChange={e=>setReply(e.target.value)}/><button className="primary" aria-label="自动发送" disabled={!canSend||busy} onClick={()=>void send()}><Send size={16}/>自动发送</button>{intent&&!canSend&&<small>存在风险或定制确认未完成，自动发送已锁定。</small>}</article>
 </div></section>
}
