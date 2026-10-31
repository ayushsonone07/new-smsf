import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiRequest,
  authedApiRequest,
  authedFileRequest,
  sameOriginApiRequest,
  subscribeToApiActivity,
} from './client'
import { clearSession, getSession, setSession } from '../app/auth/session'

const jsonResponse = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers,
  })
}

function jsonArgs(fetchMock: ReturnType<typeof vi.fn>): {
  url: string
  init: RequestInit
} {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init }
}

beforeEach(() => {
  clearSession()
})

afterEach(() => {
  clearSession()
  vi.unstubAllGlobals()
})

describe('apiRequest request setup', () => {
  it('uses no-store for GET requests and sends JSON headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/api/things')).resolves.toEqual({ ok: true })

    const { url, init } = jsonArgs(fetchMock)
    expect(url).toBe('/api/things')
    expect(init.cache).toBe('no-store')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })
  })

  it('does not cache-bust mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/things', { method: 'POST', body: '{}' })

    expect(jsonArgs(fetchMock).init.cache).toBeUndefined()
  })

  it('lets the browser set the multipart boundary for FormData bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/upload', {
      method: 'POST',
      body: new FormData(),
    })

    const headers = jsonArgs(fetchMock).init.headers as Record<string, string>
    expect(headers['Content-Type']).toBeUndefined()
    expect(headers.Accept).toBe('application/json')
  })

  it('normalizes endpoints without a leading slash', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('api/things')

    expect(jsonArgs(fetchMock).url).toBe('/api/things')
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(apiRequest('/api/empty')).resolves.toBeUndefined()
  })

  it('parses JSON even when the server labels it as plain text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"value":42}', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )
    await expect(apiRequest('/api/text')).resolves.toEqual({ value: 42 })
  })

  it('returns raw text when it is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('plain body', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )
    await expect(apiRequest('/api/text')).resolves.toBe('plain body')
  })

  it('returns undefined for an empty JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await expect(apiRequest('/api/empty-json')).resolves.toBeUndefined()
  })
})

describe('apiRequest error handling', () => {
  it('surfaces the backend message and keeps the status in ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'Validation failed' }, { status: 422 }),
      ),
    )

    const error = await apiRequest('/api/things').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Validation failed')
    expect((error as ApiError).status).toBe(422)
  })

  it('turns field-level validation errors into a readable message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: 'Bad Request', email: 'Email is invalid', phone: 'Phone is required' },
          { status: 400 },
        ),
      ),
    )

    await expect(apiRequest('/api/things')).rejects.toThrow(
      'Email is invalid Phone is required',
    )
  })

  it('falls back to the error field and then to the status message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Bad Request' }, { status: 400 }))
      .mockResolvedValueOnce(
        new Response('not json', { status: 500, headers: { 'Content-Type': 'text/plain' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/api/a')).rejects.toThrow('Bad Request')
    await expect(apiRequest('/api/b')).rejects.toThrow('Request failed with status 500')
  })

  it('reads string and object details', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ details: 'Detail message' }, { status: 400 }))
      .mockResolvedValueOnce(
        jsonResponse({ details: { first: '', second: 'Object detail' } }, { status: 400 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/api/a')).rejects.toThrow('Detail message')
    await expect(apiRequest('/api/b')).rejects.toThrow('Object detail')
  })

  it('clears the session on a genuine JWT failure', async () => {
    setSession({
      token: 'expired',
      issuedAt: '2026-01-01T00:00:00.000Z',
      user: { id: '1', name: 'Test', email: 't@example.com', role: 'HEAD' },
    })
    const fakeWindow = { location: { pathname: '/dashboard', href: '' } }
    vi.stubGlobal('window', fakeWindow)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { status: 401, error: 'Unauthorized', message: 'Invalid or expired JWT token' },
          { status: 401 },
        ),
      ),
    )

    await expect(apiRequest('/api/secure')).rejects.toBeInstanceOf(ApiError)
    expect(getSession()).toBeNull()
    expect(fakeWindow.location.href).toBe('/login?expired=true')
  })
})

describe('authedApiRequest', () => {
  it('rejects when there is no signed in session', async () => {
    const error = await authedApiRequest('/api/secure').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
  })

  it('adds the bearer token and username header', async () => {
    setSession({
      token: 'jwt-token',
      issuedAt: '2026-01-01T00:00:00.000Z',
      user: {
        id: '1',
        name: 'Test',
        email: 'user@example.com',
        username: 'user_login',
        role: 'HEAD',
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await authedApiRequest('/api/secure')

    const headers = jsonArgs(fetchMock).init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt-token')
    expect(headers.username).toBe('user@example.com')
  })
})

describe('sameOriginApiRequest', () => {
  it('routes the call through the current origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await sameOriginApiRequest('/api/proxy')

    expect(jsonArgs(fetchMock).url).toBe(`${window.location.origin}/api/proxy`)
  })
})

describe('authedFileRequest', () => {
  it('requires a session', async () => {
    await expect(authedFileRequest('/api/export')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns the blob and reads the file name from content-disposition', async () => {
    setSession({
      token: 'jwt-token',
      issuedAt: '2026-01-01T00:00:00.000Z',
      user: { id: '1', name: 'Test', email: 'user@example.com', role: 'HEAD' },
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('file-content', {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="report.pdf"',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await authedFileRequest('/api/export')

    expect(result.fileName).toBe('report.pdf')
    expect(await result.blob.text()).toBe('file-content')
    const headers = jsonArgs(fetchMock).init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt-token')
  })

  it('throws an ApiError for a failed export', async () => {
    setSession({
      token: 'jwt-token',
      issuedAt: '2026-01-01T00:00:00.000Z',
      user: { id: '1', name: 'Test', email: 'user@example.com', role: 'HEAD' },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'Export failed hard' }, { status: 500 }),
      ),
    )

    await expect(authedFileRequest('/api/export')).rejects.toThrow('Export failed hard')
  })
})

describe('api activity listener', () => {
  it('reports in-flight requests and settles back to zero', async () => {
    let resolveFetch: (response: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    const counts: number[] = []
    const unsubscribe = subscribeToApiActivity((count) => counts.push(count))

    expect(counts).toEqual([0])
    const request = apiRequest('/api/slow')
    expect(counts[counts.length - 1]).toBe(1)

    resolveFetch(jsonResponse({ done: true }))
    await request
    expect(counts[counts.length - 1]).toBe(0)

    unsubscribe()
  })
})
