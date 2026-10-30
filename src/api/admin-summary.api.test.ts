import { describe, expect, it } from 'vitest'
import { toLocalDateTimeParam } from './admin-summary.api'

describe('toLocalDateTimeParam', () => {
  it('formats local time without a timezone suffix', () => {
    expect(toLocalDateTimeParam(new Date(2026, 0, 5, 7, 8, 9))).toBe('2026-01-05T07:08:09')
  })

  it('zero pads every component', () => {
    expect(toLocalDateTimeParam(new Date(2026, 10, 9, 0, 0, 0))).toBe('2026-11-09T00:00:00')
  })
})
