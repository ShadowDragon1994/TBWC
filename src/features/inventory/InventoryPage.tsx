import { useEffect,useState } from 'react'
import { PackageSearch,ScanSearch } from 'lucide-react'
import './inventory-page.css'
type Inventory={sku:string;name:string;stock:number;daysOfStock:number;health:string;action:string;price:number;suggestedPrice:number;bundle:string}
type Competitor={competitor:string;product:string;currentPrice:number;event:string;changeRate:number|null;severity:string}
export function InventoryPage({onNotice}:{onNotice:(message:string)=>void}){
 const [inventory,setInventory]=useState<Inventory[]>([]),[competitors,setCompetitors]=useState<Competitor[]>([])
 useEffect(()=>{void fetch('/api/inventory-intelligence').then(async r=>{if(!r.ok)throw new Error('经营数据加载失败');return r.json()}).then(r=>{setInventory(r.inventory);setCompetitors(r.competitors)}).catch(e=>onNotice(e instanceof Error?e.message:'加载失败'))},[onNotice])
 return <section className="inventory-page"><header><div><p>节后经营雷达</p><h1>长尾清仓与竞品监控</h1><span>按库存周转和节后天数给出有毛利底线的动作建议。</span></div><em>模拟经营数据</em></header><div className="intel-grid"><section><h2><PackageSearch/>库存策略</h2>{inventory.map(item=><article key={item.sku}><div><b>{item.name}</b><small>{item.sku} · 库存 {item.stock} · 可售 {item.daysOfStock} 天</small></div><span className={item.health}>{item.action==='clearance'?'建议清仓':item.action==='bundle'?'建议组合':'健康'}</span><p>¥{item.price} → <b>¥{item.suggestedPrice}</b></p><p>{item.bundle}</p></article>)}</section><section><h2><ScanSearch/>竞品动态</h2>{competitors.map(item=><article key={`${item.competitor}-${item.product}`}><div><b>{item.product}</b><small>{item.competitor}</small></div><span className={item.severity}>{item.event==='new_product'?'新品':item.event==='price_drop'?'降价':item.event==='price_rise'?'涨价':'稳定'}</span><p>当前价 ¥{item.currentPrice}{item.changeRate!==null&&` · 变化 ${item.changeRate}%`}</p></article>)}</section></div></section>
}
