import { describe, expect, it } from 'vitest'
import {
  normalizeDepartmentSlug,
  normalizeDepartmentTypeName,
} from './dynamic-permission.api'

describe('normalizeDepartmentTypeName', () => {
  it('returns an empty string for empty input', () => {
    expect(normalizeDepartmentTypeName('   ')).toBe('')
  })

  it('appends the _DEPARTMENT suffix once', () => {
    expect(normalizeDepartmentTypeName('sales')).toBe('SALES_DEPARTMENT')
    expect(normalizeDepartmentTypeName('sales_department')).toBe('SALES_DEPARTMENT')
  })

  it('maps aliases to canonical department types', () => {
    expect(normalizeDepartmentTypeName('ads')).toBe('ADVERTISEMENT_DEPARTMENT')
    expect(normalizeDepartmentTypeName('ads_department')).toBe('ADVERTISEMENT_DEPARTMENT')
    expect(normalizeDepartmentTypeName('advertisement')).toBe('ADVERTISEMENT_DEPARTMENT')
    expect(normalizeDepartmentTypeName('autoweb')).toBe('AUTOWEBSION_DEPARTMENT')
    expect(normalizeDepartmentTypeName('autowebsion')).toBe('AUTOWEBSION_DEPARTMENT')
    expect(normalizeDepartmentTypeName('autowebision_department')).toBe(
      'AUTOWEBSION_DEPARTMENT',
    )
  })

  it('sanitizes punctuation and spacing', () => {
    expect(normalizeDepartmentTypeName('  google dept! ')).toBe('GOOGLE_DEPT_DEPARTMENT')
  })
})

describe('normalizeDepartmentSlug', () => {
  it('falls back to department for empty input', () => {
    expect(normalizeDepartmentSlug('')).toBe('department')
  })

  it('strips the department suffix and lowercases', () => {
    expect(normalizeDepartmentSlug('ONBOARDING_DEPARTMENT')).toBe('onboarding')
    expect(normalizeDepartmentSlug('SALES_DEPARTMENT')).toBe('sales')
  })

  it('keeps slugs safe for URLs', () => {
    expect(normalizeDepartmentSlug('  Sales & Marketing  ')).toBe('sales_marketing')
    expect(normalizeDepartmentSlug('_sales_')).toBe('sales')
  })
})
