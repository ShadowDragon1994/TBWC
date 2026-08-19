import type { SourcingOffer } from './sourcing.types'

export const mock1688Offers: SourcingOffer[] = [
  { id: 'offer-celadon-gift', title: '青瓷茶杯节日礼盒', category: '文创礼品', wholesalePrice: 35, suggestedRetailPrice: 99, minOrder: 2, supplier: '1688模拟供应商·景瓷工坊', supplierUrl: 'https://detail.1688.com/offer/mock-celadon.html', material: '陶瓷', size: '礼盒 24×18×10cm', color: '青釉', audience: '送长辈、商务赠礼', scene: '春节、中秋、乔迁', sellingPoints: '东方青瓷质感；礼盒即送；支持祝福卡定制' },
  { id: 'offer-aroma-stone', title: '东方香氛扩香石礼盒', category: '家居礼品', wholesalePrice: 22.8, suggestedRetailPrice: 69, minOrder: 5, supplier: '1688模拟供应商·闻香制造', supplierUrl: 'https://detail.1688.com/offer/mock-aroma.html', material: '石膏、香氛精油', size: '18×12×6cm', color: '米白', audience: '女性朋友、同事', scene: '生日、七夕、伴手礼', sellingPoints: '低客单精致礼物；可补充香氛；开箱仪式感' },
  { id: 'offer-notebook', title: '国风布面手账本套装', category: '文具礼品', wholesalePrice: 18.5, suggestedRetailPrice: 59, minOrder: 10, supplier: '1688模拟供应商·纸间文创', supplierUrl: 'https://detail.1688.com/offer/mock-notebook.html', material: '布面、道林纸', size: 'A5', color: '黛蓝、朱红', audience: '学生、职场人', scene: '开学季、毕业季、企业伴手礼', sellingPoints: '国风布面；礼盒套装；支持企业图案定制' },
]

export function searchMock1688Offers(query = '') {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return mock1688Offers
  return mock1688Offers.filter(offer => `${offer.title} ${offer.category} ${offer.material} ${offer.scene} ${offer.sellingPoints}`.toLowerCase().includes(normalized))
}

export function findMock1688Offer(id: string) {
  return mock1688Offers.find(offer => offer.id === id)
}
