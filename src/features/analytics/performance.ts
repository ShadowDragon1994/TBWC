import type { PerformanceRecord } from './performance.api'
export const demoPerformance:PerformanceRecord[]=[
  {id:'demo-xhs',publishingTaskId:null,productName:'东方花窗书签礼盒',platform:'小红书',title:'送老师的东方美学礼物',recordedOn:'2026-07-20',impressions:18600,views:12480,likes:986,favorites:612,comments:84,shares:106,leads:38,orders:12,revenue:1428,createdAt:'',updatedAt:''},
  {id:'demo-dy',publishingTaskId:null,productName:'胡桃木黄铜书签',platform:'抖音',title:'一枚书签的制作过程',recordedOn:'2026-07-21',impressions:32700,views:24600,likes:1820,favorites:405,comments:193,shares:236,leads:64,orders:21,revenue:2079,createdAt:'',updatedAt:''},
  {id:'demo-xhs-2',publishingTaskId:null,productName:'青瓷杯',platform:'小红书',title:'雨后青瓷，一杯东方清雅',recordedOn:'2026-07-18',impressions:9800,views:6910,likes:488,favorites:356,comments:51,shares:42,leads:17,orders:5,revenue:745,createdAt:'',updatedAt:''},
]
export function summarize(records:PerformanceRecord[]){const total=records.reduce((sum,r)=>({views:sum.views+r.views,interactions:sum.interactions+r.likes+r.favorites+r.comments+r.shares,orders:sum.orders+r.orders,revenue:sum.revenue+r.revenue}),{views:0,interactions:0,orders:0,revenue:0});return{...total,engagementRate:total.views?total.interactions/total.views:0,conversionRate:total.views?total.orders/total.views:0}}
export function byPlatform(records:PerformanceRecord[]){return(['小红书','抖音'] as const).map(platform=>({platform,...summarize(records.filter(record=>record.platform===platform))}))}
