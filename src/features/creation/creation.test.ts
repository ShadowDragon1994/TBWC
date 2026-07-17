import { describe, expect, it } from 'vitest'
import { checkCompliance, generateMockContent } from './creation'

describe('generateMockContent', () => {
  it('generates structured content from the selected mock product', () => {
    const result = generateMockContent('bookmark-gift')
    expect(result.title).toContain('东方花窗')
    expect(result.sellingPoints).toHaveLength(3)
    expect(result.status).toBe('待编辑')
  })

  it('returns a different variant on regeneration', () => {
    const first = generateMockContent('bookmark-gift', 0)
    const second = generateMockContent('bookmark-gift', 1)
    expect(second.title).not.toBe(first.title)
  })
})

describe('checkCompliance', () => {
  it('warns when copy includes the limited-quantity expression', () => {
    const findings = checkCompliance('七夕限量礼盒，送礼首选')
    expect(findings.some((finding) => finding.level === 'warning')).toBe(true)
    expect(findings[0].term).toBe('限量')
  })

  it('returns passing checks for safe copy', () => {
    const findings = checkCompliance('东方花窗书签，适合作为节日伴手礼')
    expect(findings.every((finding) => finding.level === 'pass')).toBe(true)
  })
})
