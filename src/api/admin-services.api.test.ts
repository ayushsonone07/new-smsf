import { describe, expect, it } from 'vitest'
import { normalizeServiceTypeName } from './admin-services.api'

describe('normalizeServiceTypeName', () => {
  it('uppercases and replaces whitespace with underscores', () => {
    expect(normalizeServiceTypeName('  on boarding ')).toBe('ON_BOARDING')
    expect(normalizeServiceTypeName('SEO Dept')).toBe('SEO_DEPT')
  })

  it('removes characters that are not allowed by the backend', () => {
    expect(normalizeServiceTypeName('Sales@Dept')).toBe('SALESDEPT')
    expect(normalizeServiceTypeName('web-design')).toBe('WEBDESIGN')
  })

  it('keeps already valid values unchanged', () => {
    expect(normalizeServiceTypeName('GOOGLE_DEPARTMENT')).toBe('GOOGLE_DEPARTMENT')
  })
})
