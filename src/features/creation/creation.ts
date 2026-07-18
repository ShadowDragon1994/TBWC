export type Finding = { level: 'warning' | 'pass'; term?: string; message: string }
export type ContentPlatform = '小红书' | '抖音'

const variants = [
  {
    title: '东方花窗木质书签礼盒｜七夕心意伴手礼',
    sellingPoints: ['东方花窗设计，雅致别致，传递心意', '胡桃木搭配黄铜，温润质感，经久耐用', '七夕限量心意礼，送同事、送老师皆合宜'],
  },
  {
    title: '花窗映心意｜胡桃木黄铜书签礼盒',
    sellingPoints: ['取意东方花窗，把古典意趣藏进书页', '木质礼盒妥帖收纳，拆开即有仪式感', '适合阅读爱好者的节日限量心意礼'],
  },
]

export function generateMockContent(productId: string, variant = 0, productName = '东方花窗木质书签礼盒', platform: ContentPlatform = '小红书') {
  const selected = variants[variant % variants.length]
  const title = productId === 'bookmark-gift' ? selected.title : `${productName}｜节日心意礼`
  if (platform === '抖音') return {
    ...selected,
    platform,
    title: variant % 2 === 0 ? `送礼不知道选什么？看看${productName}` : `${productName}，把东方心意送到手里`,
    body: `【开场】送礼想要有心意，又不想千篇一律？\n【展示】这款${productName}，把东方设计和日常实用放在了一起。\n【卖点】${selected.sellingPoints.join('；')}。\n【行动引导】喜欢这种东方礼物，先收藏起来，需要送礼时再来看。`,
    status: '待编辑' as const,
  }
  return {
    ...selected,
    platform,
    title,
    body: `最近发现一份很有东方气质的礼物——${productName}。\n\n${selected.sellingPoints.map(point => `✨ ${point}`).join('\n')}\n\n不张扬，但拆开很有仪式感，送朋友、同事或老师都很合适。\n\n#送礼灵感 #东方美学 #实用礼物`,
    status: '待编辑' as const,
  }
}

export function checkCompliance(copy: string): Finding[] {
  if (copy.includes('限量')) {
    return [
      { level: 'warning', term: '限量', message: '文案中包含“限量”，建议确认库存依据或改为中性表达。' },
      { level: 'pass', message: '未发现违禁词' },
      { level: 'pass', message: '未检测到虚假宣传风险' },
      { level: 'pass', message: '素材授权记录完整' },
    ]
  }
  return [
    { level: 'pass', message: '未发现违禁词' },
    { level: 'pass', message: '未检测到虚假宣传风险' },
    { level: 'pass', message: '素材授权记录完整' },
  ]
}
