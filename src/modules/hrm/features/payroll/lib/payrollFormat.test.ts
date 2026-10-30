import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatMoney,
  monthName,
  monthShortName,
  periodLabel,
  periodShort,
  toYearMonth,
} from './payrollFormat'

describe('formatMoney', () => {
  it('formats amounts with two decimals and Indian grouping', () => {
    expect(formatMoney(1234.5)).toBe('1,234.50')
    expect(formatMoney('98000')).toBe('98,000.00')
  })

  it('falls back to 0.00 for missing or invalid values', () => {
    expect(formatMoney(null)).toBe('0.00')
    expect(formatMoney(undefined)).toBe('0.00')
    expect(formatMoney('bad')).toBe('0.00')
  })
})

describe('month formatting', () => {
  it('returns full and short month names', () => {
    expect(monthName(1)).toBe('January')
    expect(monthName(12)).toBe('December')
    expect(monthShortName(3)).toBe('Mar')
  })

  it('falls back to the number for out-of-range months', () => {
    expect(monthName(13)).toBe('13')
    expect(monthShortName(0)).toBe('0')
  })

  it('builds period labels', () => {
    expect(periodLabel(3, 2026)).toBe('March 2026')
    expect(periodShort(3, 2026)).toBe('Mar 26')
  })
})

describe('toYearMonth', () => {
  it('reads the local month and year', () => {
    expect(toYearMonth(new Date(2026, 2, 15))).toEqual({ month: 3, year: 2026 })
  })
})

describe('formatDate', () => {
  it('formats valid ISO dates and passes invalid values through', () => {
    const formatted = formatDate('2026-01-05')
    expect(formatted).toContain('Jan')
    expect(formatted).toContain('2026')

    expect(formatDate(null)).toBe('-')
    expect(formatDate(undefined)).toBe('-')
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})
