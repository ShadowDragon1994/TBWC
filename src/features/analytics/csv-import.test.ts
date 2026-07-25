import { describe, expect, it } from 'vitest'
import { performanceCsvTemplate, parsePerformanceCsv } from './csv-import'

describe('performance CSV import', () => {
  it('parses a BOM, Chinese headers, quoted commas and normalizes values', () => {
    const csv = '\uFEFF平台,商品名称,作品标题,统计日期,曝光量,播放阅读,点赞,收藏,评论,分享,线索,订单,成交额\r\n小红书,青瓷杯,\"雨后青瓷,东方清雅\",2026/7/25,\"12,000\",8000,620,310,48,32,20,6,588.50'
    const result = parsePerformanceCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.records[0]).toMatchObject({
      platform: '小红书', productName: '青瓷杯', title: '雨后青瓷,东方清雅',
      recordedOn: '2026-07-25', impressions: 12000, revenue: 588.5,
    })
  })

  it('supports English aliases and Douyin values', () => {
    const headers = 'platform,productName,title,recordedOn,impressions,views,likes,favorites,comments,shares,leads,orders,revenue'
    const result = parsePerformanceCsv(`${headers}\ndouyin,木梳,制作过程,2026-07-25,100,90,8,4,2,1,1,1,39`)
    expect(result.records[0]).toMatchObject({ platform: '抖音', views: 90, orders: 1 })
  })

  it('returns row-level errors and does not accept a partial valid batch', () => {
    const csv = `${performanceCsvTemplate.trim()}\n小红书,商品,错误行,2026-13-40,-1,abc,0,0,0,0,0,0,0`
    const result = parsePerformanceCsv(csv)
    expect(result.records).toEqual([])
    expect(result.errors.some(error => error.row === 3 && error.message.includes('统计日期'))).toBe(true)
    expect(result.errors.some(error => error.row === 3 && error.message.includes('曝光量'))).toBe(true)
  })

  it('reports missing required columns', () => {
    const result = parsePerformanceCsv('平台,作品标题\n小红书,标题')
    expect(result.records).toEqual([])
    expect(result.errors[0]).toMatchObject({ row: 1 })
  })

  it('blocks files over the 1000-row batch limit before upload', () => {
    const header = performanceCsvTemplate.split('\r\n')[0]
    const row = '小红书,商品,作品,2026-07-25,0,0,0,0,0,0,0,0,0'
    const result = parsePerformanceCsv([header, ...Array.from({ length: 1001 }, () => row)].join('\n'))
    expect(result.records).toEqual([])
    expect(result.errors[0]).toMatchObject({ row: 1, message: expect.stringContaining('1000') })
  })
})
