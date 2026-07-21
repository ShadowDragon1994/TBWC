import { describe, expect, it } from 'vitest'
import { analyzePlatformContent, checkCompliance, generateMockContent } from './creation'

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

  it('generates Xiaohongshu copy with a lifestyle body and topic tags', () => {
    const result = generateMockContent('bookmark-gift', 0, '东方花窗木质书签礼盒', '小红书')
    expect(result.platform).toBe('小红书')
    expect(result.body).toContain('#送礼灵感')
    expect(result.body).toContain('东方花窗木质书签礼盒')
  })

  it('generates Douyin copy with a spoken video script and call to action', () => {
    const result = generateMockContent('bookmark-gift', 0, '东方花窗木质书签礼盒', '抖音')
    expect(result.platform).toBe('抖音')
    expect(result.body).toContain('【开场】')
    expect(result.body).toContain('【行动引导】')
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

describe('analyzePlatformContent', () => {
  it('checks Xiaohongshu title length, topic tags and custom forbidden terms', () => {
    const result = analyzePlatformContent('小红书', '这是一个超过二十个汉字且明显太长的小红书笔记标题示例', '正文没有话题标签，保证最好用', ['保证', '最好'])
    expect(result.metrics).toMatchObject({ titleLength: 26, topicCount: 0 })
    expect(result.findings.map(item => item.message)).toEqual(expect.arrayContaining([expect.stringContaining('标题建议控制在 20 字以内'), expect.stringContaining('建议添加 3～5 个话题'), expect.stringContaining('保证、最好')]))
  })

  it('estimates Douyin speaking time and checks script sections', () => {
    const result = analyzePlatformContent('抖音', '标题', '这是一段没有结构标记的短口播稿。'.repeat(30), [])
    expect(result.metrics.estimatedSeconds).toBeGreaterThan(30)
    expect(result.findings.some(item => item.message.includes('开场、展示、卖点和行动引导'))).toBe(true)
  })
})
