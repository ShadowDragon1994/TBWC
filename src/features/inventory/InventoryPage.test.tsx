import { render,screen } from '@testing-library/react'
import { beforeEach,describe,expect,it,vi } from 'vitest'
import { InventoryPage } from './InventoryPage'
describe('InventoryPage',()=>{
 beforeEach(()=>vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({inventory:[{sku:'QX-01',name:'七夕书签礼盒',stock:180,daysOfStock:90,health:'critical',action:'clearance',price:89,suggestedPrice:75.65,bundle:'礼盒 + 常青小件组合销售'}],competitors:[{competitor:'东方礼记',product:'非遗漆扇礼盒',currentPrice:79,event:'new_product',changeRate:null,severity:'high'}],meta:{source:'mock',simulated:true}}),{status:200,headers:{'Content-Type':'application/json'}}))))
 it('shows clearance and competitor alerts with simulated source label',async()=>{
  render(<InventoryPage onNotice={vi.fn()}/>)
  expect(await screen.findByText('七夕书签礼盒')).toBeInTheDocument()
  expect(screen.getByText('建议清仓')).toBeInTheDocument()
  expect(screen.getByText('新品')).toBeInTheDocument()
  expect(screen.getByText('模拟经营数据')).toBeInTheDocument()
 })
})
