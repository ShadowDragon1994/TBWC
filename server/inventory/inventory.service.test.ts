import { describe, expect, it } from 'vitest'
import { analyzeInventory, detectCompetitorChanges } from './inventory.service'

describe('inventory strategy', () => {
  it('recommends a bounded clearance discount and bundle for slow post-festival stock', () => {
    const [result] = analyzeInventory([{ sku: 'QX-01', name: '七夕书签礼盒', stock: 180, dailySales: 2, daysSinceFestival: 12, price: 89, cost: 35 }])
    expect(result).toMatchObject({ health: 'critical', action: 'clearance', suggestedPrice: 75.65 })
    expect(result.suggestedPrice).toBeGreaterThan(result.cost)
    expect(result.bundle).toContain('组合')
  })

  it('keeps healthy inventory at the current price', () => {
    const [result] = analyzeInventory([{ sku: 'A', name: '常青香囊', stock: 30, dailySales: 5, daysSinceFestival: 0, price: 59, cost: 20 }])
    expect(result).toMatchObject({ health: 'healthy', action: 'hold', suggestedPrice: 59 })
  })
})

describe('competitor monitoring', () => {
  it('detects new products and material price changes', () => {
    const changes = detectCompetitorChanges([
      { competitor: '东方礼记', product: '漆扇礼盒', currentPrice: 79, previousPrice: null },
      { competitor: '木作研究所', product: '黄铜书签', currentPrice: 59, previousPrice: 69 },
    ])
    expect(changes[0].event).toBe('new_product')
    expect(changes[1]).toMatchObject({ event: 'price_drop', changeRate: -14.5 })
  })
})
