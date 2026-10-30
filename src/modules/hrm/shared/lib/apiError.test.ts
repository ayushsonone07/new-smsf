import { describe, expect, it, vi } from 'vitest'

const { HrApiException } = vi.hoisted(() => {
  class HrApiException extends Error {
    code: string
    field?: string
    constructor(error: { code: string; message: string; field?: string }) {
      super(error.message)
      this.name = 'HrApiException'
      this.code = error.code
      this.field = error.field
    }
  }
  return { HrApiException }
})

vi.mock('@shared/services', () => ({ HrApiException }))

import { getApiErrorMessage } from './apiError'

function axiosError(data?: unknown, message = 'Request failed'): unknown {
  return {
    isAxiosError: true,
    message,
    response: data === undefined ? undefined : { data },
  }
}

describe('getApiErrorMessage', () => {
  it('reads the message from HrApiException', () => {
    const error = new HrApiException({ code: 'INVALID', message: 'HR failure' })
    expect(getApiErrorMessage(error)).toBe('HR failure')
  })

  it('reads the HR envelope error message', () => {
    expect(
      getApiErrorMessage(axiosError({ success: false, error: { code: 'X', message: 'Envelope error' } })),
    ).toBe('Envelope error')
  })

  it('reads the legacy envelope message', () => {
    expect(getApiErrorMessage(axiosError({ status: 400, message: 'Legacy error' }))).toBe(
      'Legacy error',
    )
  })

  it('falls back to the axios message when the body has no message', () => {
    expect(getApiErrorMessage(axiosError({ status: 500 }, 'Network down'))).toBe('Network down')
    expect(getApiErrorMessage(axiosError(undefined, 'Timeout'))).toBe('Timeout')
  })

  it('handles generic errors and unknown values', () => {
    expect(getApiErrorMessage(new Error('Boom'))).toBe('Boom')
    expect(getApiErrorMessage(new Error(''), 'Fallback')).toBe('Fallback')
    expect(getApiErrorMessage('a string', 'Fallback')).toBe('Fallback')
    expect(getApiErrorMessage(null)).toBe('Something went wrong.')
  })
})
