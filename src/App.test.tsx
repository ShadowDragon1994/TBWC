import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App interactions', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('opens the product library from navigation', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '商品库' }))
    expect(screen.getByRole('heading', { name: '商品库' })).toBeInTheDocument()
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

  it('opens saved creation records from navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '创作记录' }))
    expect(screen.getByRole('heading', { name: '创作记录' })).toBeInTheDocument()
  })
})
