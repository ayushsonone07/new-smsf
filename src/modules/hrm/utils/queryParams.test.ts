import { describe, expect, it } from 'vitest'
import { buildQueryParams, toQueryString } from './queryParams'

describe('buildQueryParams', () => {
  it('drops null and undefined values but keeps booleans and empty strings', () => {
    expect(
      buildQueryParams({
        page: 1,
        active: true,
        search: '',
        missing: null,
        absent: undefined,
      }),
    ).toEqual({ page: '1', active: 'true', search: '' })
  })
})

describe('toQueryString', () => {
  it('returns an empty string when there is nothing to send', () => {
    expect(toQueryString({})).toBe('')
    expect(toQueryString({ a: null, b: undefined, c: '' })).toBe('')
  })

  it('encodes keys and values', () => {
    expect(toQueryString({ q: 'hello world', page: 2, active: false })).toBe(
      '?q=hello%20world&page=2&active=false',
    )
  })
})
