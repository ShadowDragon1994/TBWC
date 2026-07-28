import { describe, expect, it } from 'vitest'
import { analyzeCustomerIntent, buildServiceReply } from './intent.service'

describe('customer service intent', () => {
  it('extracts gift recipient, holiday, delivery deadline and customization details', () => {
    const result = analyzeCustomerIntent('送给女朋友的七夕礼物，预算200以内，8月18日前到杭州，可以刻字“小满”并礼盒包装吗？')

    expect(result).toMatchObject({
      purpose: 'gift',
      recipient: '女朋友',
      holiday: '七夕',
      budgetMax: 200,
      destination: '杭州',
      customization: { engraving: '小满', giftWrap: true },
    })
    expect(result.deadline).toContain('8月18日')
    expect(result.requiresConfirmation).toBe(true)
  })

  it('flags urgent delivery promises and incomplete customization for human handling', () => {
    const result = analyzeCustomerIntent('明天必须到，帮我定制刻字')
    expect(result.risks).toEqual(expect.arrayContaining(['极限时效承诺', '定制信息不完整']))
    expect(result.autoSendAllowed).toBe(false)
  })

  it('builds a bounded reply without promising an unverified arrival date', () => {
    const intent = analyzeCustomerIntent('送老师，教师节前到北京，预算100以内')
    const reply = buildServiceReply(intent)
    expect(reply).toContain('需要根据收货地区和下单时间确认')
    expect(reply).not.toContain('保证送达')
  })
})
