import { render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,describe,expect,it,vi } from 'vitest'
import { AutomationStudio } from './AutomationStudio'
describe('AutomationStudio',()=>{
 beforeEach(()=>vi.stubGlobal('fetch',vi.fn()
  .mockResolvedValueOnce(new Response(JSON.stringify({data:{emergencyStopped:false}}),{status:200,headers:{'Content-Type':'application/json'}}))
  .mockResolvedValueOnce(new Response(JSON.stringify({data:{status:'succeeded',output:{accepted:true,simulated:true,capability:'photoshop.bridge'}}}),{status:201,headers:{'Content-Type':'application/json'}}))))
 it('submits a Photoshop bridge plan and shows the execution result',async()=>{
  render(<AutomationStudio onNotice={vi.fn()}/>)
  expect(await screen.findByText('运行中')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button',{name:'执行 PS 桥接'}))
  expect(await screen.findByText('桥接任务已完成')).toBeInTheDocument()
  expect(fetch).toHaveBeenLastCalledWith('/api/automation/executions',expect.objectContaining({method:'POST'}))
 })
})
