export type InventoryMetric={sku:string;name:string;stock:number;dailySales:number;daysSinceFestival:number;price:number;cost:number}
export function analyzeInventory(items:InventoryMetric[]){
 return items.map(item=>{
  const daysOfStock=item.dailySales>0?item.stock/item.dailySales:999
  const critical=item.daysSinceFestival>=7&&daysOfStock>45
  const warning=!critical&&daysOfStock>25
  const discount=critical?.15:warning?.08:0
  const suggestedPrice=Number(Math.max(item.cost*1.25,item.price*(1-discount)).toFixed(2))
  return {...item,daysOfStock:Number(daysOfStock.toFixed(1)),health:critical?'critical' as const:warning?'warning' as const:'healthy' as const,action:critical?'clearance' as const:warning?'bundle' as const:'hold' as const,suggestedPrice,bundle:critical?`${item.name} + 常青小件组合销售`:warning?'搭配高周转商品满减':'维持单品销售'}
 })
}
export type CompetitorSnapshot={competitor:string;product:string;currentPrice:number;previousPrice:number|null}
export function detectCompetitorChanges(items:CompetitorSnapshot[]){
 return items.map(item=>{
  if(item.previousPrice===null)return {...item,event:'new_product' as const,changeRate:null,severity:'high' as const}
  const changeRate=Number(((item.currentPrice-item.previousPrice)/item.previousPrice*100).toFixed(1))
  const event=changeRate<=-5?'price_drop' as const:changeRate>=5?'price_rise' as const:'stable' as const
  return {...item,event,changeRate,severity:Math.abs(changeRate)>=10?'high' as const:Math.abs(changeRate)>=5?'medium' as const:'low' as const}
 })
}
export const mockInventory:InventoryMetric[]=[
 {sku:'QX-01',name:'七夕黄铜书签礼盒',stock:180,dailySales:2,daysSinceFestival:12,price:89,cost:35},
 {sku:'XN-02',name:'东方香囊挂件',stock:96,dailySales:3,daysSinceFestival:8,price:49,cost:16},
 {sku:'CS-03',name:'常青木作杯垫',stock:30,dailySales:5,daysSinceFestival:0,price:39,cost:12},
]
export const mockCompetitors:CompetitorSnapshot[]=[
 {competitor:'东方礼记',product:'非遗漆扇礼盒',currentPrice:79,previousPrice:null},
 {competitor:'木作研究所',product:'黄铜书签',currentPrice:59,previousPrice:69},
 {competitor:'山海文房',product:'香囊挂件',currentPrice:52,previousPrice:49},
]
