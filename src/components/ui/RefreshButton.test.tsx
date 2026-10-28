import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RefreshButton } from './RefreshButton'

describe('RefreshButton', () => {
  it('calls onRefresh and is disabled until the refresh promise settles', async () => {
    let resolve: () => void = () => {}
    const onRefresh = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    render(<RefreshButton onRefresh={onRefresh} label="customers" />)

    const button = screen.getByRole('button', { name: 'Refresh customers' })
    await userEvent.click(button)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()

    // A second click while refreshing does not fire another request.
    await userEvent.click(button)
    expect(onRefresh).toHaveBeenCalledTimes(1)

    resolve()
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('is disabled while the section is already fetching', () => {
    render(<RefreshButton onRefresh={vi.fn()} isRefreshing label="flow" />)
    expect(screen.getByRole('button', { name: 'Refresh flow' })).toBeDisabled()
  })

  it('recovers when onRefresh fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRefresh = vi.fn(() => Promise.reject(new Error('network')))
    render(<RefreshButton onRefresh={onRefresh} />)

    const button = screen.getByRole('button', { name: 'Refresh data' })
    await userEvent.click(button)
    await waitFor(() => expect(button).not.toBeDisabled())
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not trigger parent click handlers', async () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <RefreshButton onRefresh={vi.fn()} />
      </div>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(parentClick).not.toHaveBeenCalled()
  })
})
