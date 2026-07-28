export type CustomerIntent = {
  purpose: 'gift' | 'self-use' | 'unknown'
  recipient: string
  holiday: string
  budgetMax: number | null
  destination: string
  deadline: string
  customization: { engraving: string; giftWrap: boolean }
  requiresConfirmation: boolean
  risks: string[]
  autoSendAllowed: boolean
  confidence: number
}

const holidays = ['春节', '情人节', '母亲节', '父亲节', '七夕', '教师节', '中秋', '圣诞', '生日', '毕业']
const recipients = ['女朋友', '男朋友', '老师', '妈妈', '母亲', '爸爸', '父亲', '朋友', '同事', '客户', '孩子', '长辈']
const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '南京', '武汉', '苏州', '西安', '天津']

export function analyzeCustomerIntent(message: string): CustomerIntent {
  const text = message.trim()
  const purpose = /送给|送人|礼物|礼品|赠送/.test(text) ? 'gift' : /自用|自己用|给自己/.test(text) ? 'self-use' : 'unknown'
  const recipient = recipients.find(value => text.includes(value)) ?? ''
  const holiday = holidays.find(value => text.includes(value)) ?? ''
  const budgetMatch = text.match(/(?:预算|不超过|以内|最多)\D{0,4}(\d{1,6})|(\d{1,6})\s*元?\s*以内/)
  const budgetMax = budgetMatch ? Number(budgetMatch[1] ?? budgetMatch[2]) : null
  const destination = cities.find(value => text.includes(value)) ?? ''
  const deadline = text.match(/(\d{1,2}月\d{1,2}日(?:前|之前|当天)?)/)?.[1]
    ?? text.match(/((?:今天|明天|后天|本周|下周)(?:前|之前)?)/)?.[1]
    ?? text.match(/((?:春节|情人节|母亲节|父亲节|七夕|教师节|中秋|圣诞)(?:前|之前|当天)?)/)?.[1]
    ?? ''
  const engravingMatch = text.match(/刻字[为是：:\s]*[“"']?([^”"'，。,？?\s]{1,20})[”"']?/)
  const requestsEngraving = /刻字|雕刻|定制文字/.test(text)
  const engraving = engravingMatch?.[1] && !['吗', '呢', '可以吗'].includes(engravingMatch[1]) ? engravingMatch[1] : ''
  const giftWrap = /礼盒|包装|礼品袋|贺卡/.test(text)
  const risks: string[] = []
  if (/今天|明天|后天|必须到|保证到/.test(text)) risks.push('极限时效承诺')
  if (requestsEngraving && !engraving) risks.push('定制信息不完整')
  if (/假一赔|绝对|百分百|保证效果|治疗/.test(text)) risks.push('高风险承诺')
  const requiresConfirmation = requestsEngraving || giftWrap
  const recognized = [purpose !== 'unknown', Boolean(recipient), Boolean(holiday), budgetMax !== null, Boolean(destination), Boolean(deadline), requestsEngraving || giftWrap].filter(Boolean).length

  return {
    purpose,
    recipient,
    holiday,
    budgetMax,
    destination,
    deadline,
    customization: { engraving, giftWrap },
    requiresConfirmation,
    risks,
    autoSendAllowed: risks.length === 0 && !requiresConfirmation,
    confidence: Number(Math.min(0.98, 0.45 + recognized * 0.075).toFixed(2)),
  }
}

export function buildServiceReply(intent: CustomerIntent) {
  const recipient = intent.recipient ? `送${intent.recipient}` : '这份礼物'
  const budget = intent.budgetMax ? `，预算控制在 ${intent.budgetMax} 元以内` : ''
  const customization = intent.customization.engraving ? `，刻字内容为“${intent.customization.engraving}”` : ''
  const wrap = intent.customization.giftWrap ? '，并使用礼盒包装' : ''
  const delivery = intent.deadline || intent.destination
    ? `关于${intent.deadline || '期望日期'}送达${intent.destination ? ` ${intent.destination}` : ''}，需要根据收货地区和下单时间确认，确认后再给您准确答复。`
    : '如果有期望到货日期和收货城市，也可以告诉我，我帮您核对时效。'
  return `了解到您准备${recipient}${budget}${customization}${wrap}。${delivery}`
}
