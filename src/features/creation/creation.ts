export type Finding = { level: 'warning' | 'pass'; term?: string; message: string }

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

export function generateMockContent(productId: string, variant = 0, productName = '东方花窗木质书签礼盒') {
  const selected = variants[variant % variants.length]
  if (productId === 'bookmark-gift') return { ...selected, status: '待编辑' as const }
  return { ...selected, title: `${productName}｜节日心意礼`, status: '待编辑' as const }
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
