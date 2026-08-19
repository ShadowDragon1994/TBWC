import { describe, expect, it } from 'vitest'
import { normalize1688Card } from './rpa-1688.adapter'

describe('1688 RPA result normalization', () => {
  it('extracts offer identity, price, MOQ and supplier evidence from a product card', () => {
    expect(normalize1688Card({
      href: 'https://detail.1688.com/offer/123456.html',
      text: '七夕定制香囊礼盒\n¥ 26.80\n2件起批\n杭州礼品工厂\n支持刺绣定制',
    })).toMatchObject({
      id: '1688-123456', title: '七夕定制香囊礼盒', wholesalePrice: 26.8,
      minOrder: 2, supplier: '杭州礼品工厂', supplierUrl: 'https://detail.1688.com/offer/123456.html',
    })
  })

  it('ignores links that are not 1688 offer detail pages', () => {
    expect(normalize1688Card({ href: 'https://www.1688.com/', text: '首页' })).toBeUndefined()
  })

  it('supports the current 1688 tracked offer links', () => {
    expect(normalize1688Card({
      href: 'https://dj.1688.com/ci_bb?a=123&ap=2&rp=2',
      text: '定制宋锦葫芦香包复古挂件七夕送礼¥2.00深圳市新宝悦纺织科技有限公司旺旺在线',
    })).toMatchObject({
      title: '定制宋锦葫芦香包复古挂件七夕送礼', wholesalePrice: 2,
      supplier: '深圳市新宝悦纺织科技有限公司',
    })
  })
})
