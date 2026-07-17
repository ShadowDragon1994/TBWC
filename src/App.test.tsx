import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App interactions', () => {
  it('shows clear feedback when navigating to a future workspace', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '商品库' }))
    expect(screen.getByRole('status')).toHaveTextContent('商品库将在下一版本开放')
  })

  it('switches the selected export specification', async () => {
    render(<App />)
    const detail = screen.getByRole('button', { name: /详情页长图 750px/ })
    await userEvent.click(detail)
    expect(detail).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the canvas zoom with toolbar buttons', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '放大画布' }))
    expect(screen.getByText('60%')).toBeInTheDocument()
  })
})
