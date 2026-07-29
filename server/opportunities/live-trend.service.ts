import type { TrendMetric } from './opportunity.service'

const objectValue = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? '0').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function mapSearchFeedsToMetric(keyword: string, feeds: unknown[]): TrendMetric {
  let interactions = 0
  const authors = new Set<string>()
  for (const item of feeds) {
    const feed = objectValue(item)
    const card = objectValue(feed.note_card ?? feed.noteCard)
    const info = objectValue(card.interact_info ?? card.interactInfo ?? feed.interact_info)
    interactions += numberValue(info.liked_count ?? info.likedCount)
      + numberValue(info.collected_count ?? info.collectedCount)
      + numberValue(info.comment_count ?? info.commentCount)
    const user = objectValue(feed.user ?? card.user)
    const authorId = String(user.user_id ?? user.userId ?? user.nickname ?? '')
    if (authorId) authors.add(authorId)
  }
  const noteCount = feeds.length
  const averageInteractions = noteCount ? interactions / noteCount : 0
  return {
    keyword,
    searchHeat: Math.round(interactions + noteCount * 100),
    noteCount,
    growthRate: 0,
    engagementRate: Number((averageInteractions / (averageInteractions + 500) * 0.15).toFixed(4)),
    competitorCount: authors.size || noteCount,
  }
}

export function extractFeeds(output: Record<string, unknown>) {
  const direct = output.feeds ?? output.items ?? output.data
  if (Array.isArray(direct)) return direct
  const nested = objectValue(direct)
  return Array.isArray(nested.feeds) ? nested.feeds : []
}
