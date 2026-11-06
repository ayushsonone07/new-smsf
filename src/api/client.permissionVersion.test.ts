import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../app/queryClient'
import { apiRequest } from './client'

function respondWith(version: string | null, status = 200) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (version !== null) headers.set('X-Permission-Version', version)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', { status, headers })),
  )
}

describe('permission version tracking', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('refetches permissions only when the backend version rises', async () => {
    const invalidate = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)

    // First version seen: everything just loaded, so there is nothing to refetch.
    respondWith('100')
    await apiRequest('/api/first')
    expect(invalidate).not.toHaveBeenCalled()

    respondWith('100')
    await apiRequest('/api/same')
    expect(invalidate).not.toHaveBeenCalled()

    // No header, e.g. Redis is down or another service answered.
    respondWith(null)
    await apiRequest('/api/no-header')
    expect(invalidate).not.toHaveBeenCalled()

    respondWith('101')
    await apiRequest('/api/changed')
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dynamic-permissions'] })

    // A replica that hasn't seen the change yet must not trigger another refetch.
    respondWith('100')
    await apiRequest('/api/lagging-replica')
    respondWith('101')
    await apiRequest('/api/caught-up')
    expect(invalidate).toHaveBeenCalledTimes(1)

    // Error responses carry the version too.
    respondWith('102', 500)
    await expect(apiRequest('/api/failed')).rejects.toThrow()
    expect(invalidate).toHaveBeenCalledTimes(2)
  })
})
