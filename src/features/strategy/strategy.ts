import { byPlatform, summarize } from '../analytics/performance'
import type { PerformanceRecord } from '../analytics/performance.api'

const rate = (record: PerformanceRecord, kind: 'engagement' | 'conversion') => {
  if (!record.views) return 0
  return kind === 'engagement'
    ? (record.likes + record.favorites + record.comments + record.shares) / record.views
    : record.orders / record.views
}
const percent = (value: number) => `${(value * 100).toFixed(2)}%`

export type StrategyRecommendation = { type: '互动' | '转化' | '商品'; title: string; evidence: string; action: string; platform: '小红书' | '抖音' }

export function buildStrategy(records: PerformanceRecord[]) {
  const fallback = records[0]
  if (!fallback) return { recommendations: [] as StrategyRecommendation[], schedule: [] as Array<{ day: string; platform: string; topic: string; goal: string }> }
  const platformStats = byPlatform(records)
  const engagementPlatform = [...platformStats].sort((a, b) => b.engagementRate - a.engagementRate)[0]
  const conversionPlatform = [...platformStats].sort((a, b) => b.conversionRate - a.conversionRate)[0]
  const engagementWinner = records.filter(record => record.platform === engagementPlatform.platform).sort((a, b) => rate(b, 'engagement') - rate(a, 'engagement'))[0]
  const conversionWinner = records.filter(record => record.platform === conversionPlatform.platform).sort((a, b) => rate(b, 'conversion') - rate(a, 'conversion'))[0]
  const products = new Map<string, { revenue: number; platform: '小红书' | '抖音' }>()
  records.forEach(record => { const current = products.get(record.productName) ?? { revenue: 0, platform: record.platform }; products.set(record.productName, { ...current, revenue: current.revenue + record.revenue }) })
  const [topProduct, productData] = [...products.entries()].sort((a, b) => b[1].revenue - a[1].revenue)[0]
  const recommendations: StrategyRecommendation[] = [
    { type: '互动', platform: engagementPlatform.platform, title: `继续放大${engagementPlatform.platform}互动内容`, evidence: `《${engagementWinner.title}》互动率 ${percent(rate(engagementWinner, 'engagement'))}，为当前最高。`, action: `复用其标题结构与内容节奏，下一轮至少制作 2 条${engagementPlatform.platform}同类内容。` },
    { type: '转化', platform: conversionPlatform.platform, title: `用${conversionPlatform.platform}承接成交`, evidence: `《${conversionWinner.title}》订单转化率 ${percent(rate(conversionWinner, 'conversion'))}。`, action: '保留明确使用场景、价格锚点和购买引导，并为该结构制作一个新版本。' },
    { type: '商品', platform: productData.platform, title: `优先投入“${topProduct}”`, evidence: `该商品累计归因成交额 ¥${productData.revenue.toFixed(0)}，为当前最高。`, action: '下一周期围绕送礼、使用场景、制作过程三个角度连续验证。' },
  ]
  const schedule = [
    { day: '周一', platform: engagementPlatform.platform, topic: `${topProduct}｜场景种草`, goal: '收藏与评论' },
    { day: '周三', platform: conversionPlatform.platform, topic: `${conversionWinner.productName}｜真实使用演示`, goal: '订单转化' },
    { day: '周五', platform: engagementWinner.platform, topic: `${engagementWinner.productName}｜制作过程`, goal: '播放与分享' },
    { day: '周日', platform: productData.platform, topic: `${topProduct}｜一周反馈复盘`, goal: '线索收集' },
  ]
  return { recommendations, schedule, overview: summarize(records) }
}

export function strategyAsText(records: PerformanceRecord[]) {
  const strategy = buildStrategy(records)
  return ['造物台｜下一轮内容策略', '', ...strategy.recommendations.flatMap(item => [`【${item.type}】${item.title}`, `依据：${item.evidence}`, `行动：${item.action}`, '']), '下周内容清单', ...strategy.schedule.map(item => `${item.day}｜${item.platform}｜${item.topic}｜目标：${item.goal}`)].join('\n')
}
