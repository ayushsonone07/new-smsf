import { describe, expect, it } from 'vitest'
import { formatRupees, normalizeAmountToRupees } from './paymentUtils'

describe('normalizeAmountToRupees', () => {
  it('keeps numeric values unchanged', () => {
    expect(normalizeAmountToRupees(98000)).toBe(98000)
    expect(normalizeAmountToRupees('1190.50')).toBe(1190.5)
  })

  it('treats missing or unparseable values as zero', () => {
    expect(normalizeAmountToRupees(null)).toBe(0)
    expect(normalizeAmountToRupees(undefined)).toBe(0)
    expect(normalizeAmountToRupees('')).toBe(0)
    expect(normalizeAmountToRupees('not-a-number')).toBe(0)
  })
})

describe('formatRupees', () => {
  it('formats whole rupee amounts with Indian digit grouping', () => {
    expect(formatRupees(140000).endsWith('1,40,000')).toBe(true)
    expect(formatRupees('98000').endsWith('98,000')).toBe(true)
  })

  it('keeps up to two decimal places', () => {
    expect(formatRupees(1190.5).endsWith('1,190.5')).toBe(true)
    expect(formatRupees('1190.456').endsWith('1,190.46')).toBe(true)
  })

  it('formats the zero fallback for invalid input', () => {
    expect(formatRupees(null).endsWith('0')).toBe(true)
    expect(formatRupees('bad').endsWith('0')).toBe(true)
  })
})
