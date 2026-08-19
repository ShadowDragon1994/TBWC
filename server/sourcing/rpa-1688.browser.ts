import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'
import { normalize1688Card } from './rpa-1688.adapter'
import type { Search1688 } from './sourcing.types'

export function create1688BrowserSearch({ profileDir, headless = false }: { profileDir: string; headless?: boolean }): Search1688 {
  return async query => {
    mkdirSync(profileDir, { recursive: true })
    const context = await chromium.launchPersistentContext(profileDir, { channel: 'msedge', headless, viewport: { width: 1440, height: 960 } })
    try {
      const page = context.pages()[0] ?? await context.newPage()
      await page.goto(`https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const offerLinks = page.locator('a[href*="detail.1688.com/offer/"], a[href*="dj.1688.com/ci_bb"]')
      try {
        await offerLinks.first().waitFor({ state: 'attached', timeout: 120_000 })
      } catch (error) {
        const diagnosticDir = join(dirname(profileDir), 'diagnostics')
        mkdirSync(diagnosticDir, { recursive: true })
        await page.screenshot({ path: join(diagnosticDir, '1688-last-error.png'), fullPage: true }).catch(() => undefined)
        const title = await page.title().catch(() => '')
        throw new Error(`1688页面未出现商品结果（${title || page.url()}）。请在打开的 Edge 中完成登录或验证后重试。`, { cause: error })
      }
      const cards = await offerLinks.filter({ hasText: /¥\s*\d/ }).evaluateAll(anchors => anchors.slice(0, 40).map(anchor => {
        const element = anchor as HTMLAnchorElement
        const container = element.closest('[class*="offer"], [class*="card"], [class*="item"]') ?? element.parentElement
        return { href: element.href, text: (container?.textContent ?? element.textContent ?? '').trim() }
      }))
      return [...new Map(cards.map(normalize1688Card).filter(offer => offer).map(offer => [offer!.id, offer!])).values()].slice(0, 20)
    } finally { await context.close() }
  }
}
