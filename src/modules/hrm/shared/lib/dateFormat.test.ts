import { describe, expect, it } from 'vitest'
import { fromApiDate, fromIsoUtc, parseDailyDate, toApiDate } from './dateFormat'

describe('toApiDate', () => {
  it('formats a date as zero padded DD/MM/YYYY', () => {
    expect(toApiDate(new Date(2026, 0, 5))).toBe('05/01/2026')
    expect(toApiDate(new Date(2026, 11, 31))).toBe('31/12/2026')
  })
})

describe('fromApiDate', () => {
  it('parses DD/MM/YYYY in local time', () => {
    const date = fromApiDate('05/01/2026')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(0)
    expect(date?.getDate()).toBe(5)
  })

  it('returns null for invalid formats', () => {
    expect(fromApiDate('2026-01-05')).toBeNull()
    expect(fromApiDate('5/1/2026')).toBeNull()
    expect(fromApiDate('')).toBeNull()
  })
})

describe('fromIsoUtc', () => {
  it('parses ISO strings and returns null for empty or invalid values', () => {
    expect(fromIsoUtc('2026-01-05T10:00:00.000Z')?.toISOString()).toBe('2026-01-05T10:00:00.000Z')
    expect(fromIsoUtc(null)).toBeNull()
    expect(fromIsoUtc(undefined)).toBeNull()
    expect(fromIsoUtc('not-a-date')).toBeNull()
  })
})

describe('parseDailyDate', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const date = parseDailyDate('2026-01-05')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(0)
    expect(date?.getDate()).toBe(5)
    expect(date?.getHours()).toBe(0)
  })

  it('returns null for invalid values', () => {
    expect(parseDailyDate('05/01/2026')).toBeNull()
    expect(parseDailyDate('')).toBeNull()
  })
})
