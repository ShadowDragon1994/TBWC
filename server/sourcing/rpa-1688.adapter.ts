import type { AutomationAdapter } from '../automation/automation.service'
import { createHash } from 'node:crypto'
import type { Search1688, SourcingOffer } from './sourcing.types'

export function create1688RpaAutomationAdapter(search: Search1688): AutomationAdapter {
  return {
    id: 'rpa-1688', name: '1688 Edge RPA', capabilities: ['supply.1688.collect'],
    async execute(job) {
      const query = String(job.payload.query ?? '').trim()
      if (!query) return { output: { accepted: true, offerId: String(job.payload.offerId ?? ''), simulated: false } }
      const offers = await search(query)
      return { output: { query, offers, count: offers.length, simulated: false } }
    },
  }
}

export function normalize1688Card(card: { href: string; text: string }): SourcingOffer | undefined {
  const detailId = card.href.match(/offer\/(\d+)\.html/i)?.[1]
  const isTrackedOffer = card.href.startsWith('https://dj.1688.com/ci_bb') && /¥\s*\d/.test(card.text)
  if (!detailId && !isTrackedOffer) return undefined
  const id = detailId ?? createHash('sha256').update(card.href).digest('hex').slice(0, 16)
  const title = (card.text.match(/^(.+?)¥\s*\d/)?.[1] ?? card.text.split(/\r?\n/).map(value => value.trim()).find(value => value.length >= 4 && !/^¥/.test(value)) ?? '').trim()
  if (!title) return undefined
  const price = Number(card.text.match(/¥\s*(\d+(?:\.\d+)?)/)?.[1] ?? 0)
  const minOrder = Number(card.text.match(/(\d+)\s*(?:件|个|套)起批/)?.[1] ?? 1)
  const lines = card.text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
  const supplier = card.text.match(/¥\s*\d+(?:\.\d+)?(.+?(?:有限公司|工厂|商行|供应链|旗舰店))/)?.[1]?.trim()
    ?? lines.find(value => /厂|公司|商行|供应链|旗舰店/.test(value)) ?? '1688供应商'
  return {
    id: `1688-${id}`, title, category: '1688货源', wholesalePrice: price,
    suggestedRetailPrice: Math.round(price * 2.5 * 100) / 100, minOrder, supplier,
    supplierUrl: card.href, material: '', size: '', color: '', audience: '', scene: '',
    sellingPoints: lines.length > 1 ? lines.filter(value => value !== title && value !== supplier).slice(0, 3).join('；') : '1688搜索实时采集',
  }
}
