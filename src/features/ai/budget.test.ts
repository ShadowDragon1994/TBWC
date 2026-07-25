import { describe, expect, it } from 'vitest'
import { getBudgetStatus } from './budget'

describe('getBudgetStatus', () => {
  it('does not warn when no monthly budget is configured', () => {
    expect(getBudgetStatus(25, 0)).toEqual({ level: 'none', percent: 0 })
  })

  it('warns after 80 percent and requires confirmation at 100 percent', () => {
    expect(getBudgetStatus(8, 10)).toEqual({ level: 'warning', percent: 80 })
    expect(getBudgetStatus(10.5, 10)).toEqual({ level: 'exceeded', percent: 105 })
  })
})
