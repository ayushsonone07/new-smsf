import { describe, expect, it } from 'vitest'
import { decodeJwtClaims } from './auth.api'

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('decodeJwtClaims', () => {
  it('decodes the JWT payload', () => {
    const payload = { sub: 'user@example.com', role: 'HEAD', departmentType: 'SALES_DEPARTMENT' }
    const token = `${base64Url('{"alg":"HS256"}')}.${base64Url(JSON.stringify(payload))}.signature`

    expect(decodeJwtClaims(token)).toEqual(payload)
  })

  it('supports base64url characters in the payload', () => {
    const payload = { note: '???>>>' }
    const token = `header.${base64Url(JSON.stringify(payload))}.signature`
    expect(decodeJwtClaims(token)).toEqual(payload)
  })

  it('returns an empty object for malformed tokens', () => {
    expect(decodeJwtClaims('')).toEqual({})
    expect(decodeJwtClaims('header-only')).toEqual({})
    expect(decodeJwtClaims('header.%%%.signature')).toEqual({})
  })
})
