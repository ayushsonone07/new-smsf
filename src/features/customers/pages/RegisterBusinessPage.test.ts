import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DURATION_OPTIONS,
  extractPlanDurationMonths,
  monthsLabel,
} from './RegisterBusinessPage'

describe('RegisterBusinessPage - Duration Filter & Extraction', () => {
  it('provides default duration options for 1, 3, 6, 12 months', () => {
    expect(DEFAULT_DURATION_OPTIONS).toEqual([1, 3, 6, 12])
  })

  it('formats month labels correctly', () => {
    expect(monthsLabel(1)).toBe('1 month')
    expect(monthsLabel(3)).toBe('3 months')
    expect(monthsLabel(6)).toBe('6 months')
    expect(monthsLabel(12)).toBe('12 months')
  })

  describe('extractPlanDurationMonths', () => {
    it('prefers explicit backend durationMonths when positive', () => {
      expect(extractPlanDurationMonths('1 Month Plan', '', 6)).toBe(6)
      expect(extractPlanDurationMonths('Annual Plan', '', 12)).toBe(12)
    })

    it('extracts month numbers from plan names when backend duration is missing', () => {
      expect(extractPlanDurationMonths('Google Department 1 Month', '', null)).toBe(1)
      expect(extractPlanDurationMonths('SEO Package 3 Months', '', 0)).toBe(3)
      expect(extractPlanDurationMonths('Social Media 6 Month', '', null)).toBe(6)
      expect(extractPlanDurationMonths('Business 12 Month Plan', '', null)).toBe(12)
      expect(extractPlanDurationMonths('CRM 12 moth', '', 0)).toBe(12)
      expect(extractPlanDurationMonths('Starter 1mo', '', null)).toBe(1)
      expect(extractPlanDurationMonths('Trial 3mo', '', null)).toBe(3)
    })

    it('extracts year durations into months', () => {
      expect(extractPlanDurationMonths('Enterprise 1 Year', '', null)).toBe(12)
      expect(extractPlanDurationMonths('VIP 2 Years', '', null)).toBe(24)
      expect(extractPlanDurationMonths('Standard 1 yr', '', null)).toBe(12)
    })

    it('extracts named terms like annual, quarterly, half-yearly, monthly', () => {
      expect(extractPlanDurationMonths('Annual Marketing Plan', '', null)).toBe(12)
      expect(extractPlanDurationMonths('Quarterly SEO Push', '', null)).toBe(3)
      expect(extractPlanDurationMonths('Half-Yearly Maintenance', '', null)).toBe(6)
      expect(extractPlanDurationMonths('Semi-Annual Growth', '', null)).toBe(6)
      expect(extractPlanDurationMonths('Monthly Support', '', null)).toBe(1)
    })

    it('extracts bounded short month notation like 1m, 3m, 6m, 12m', () => {
      expect(extractPlanDurationMonths('Package 1m', '', null)).toBe(1)
      expect(extractPlanDurationMonths('Package 3m', '', null)).toBe(3)
      expect(extractPlanDurationMonths('Package 6M', '', null)).toBe(6)
      expect(extractPlanDurationMonths('Package 12M', '', null)).toBe(12)
    })

    it('falls back to description if name has no duration', () => {
      expect(extractPlanDurationMonths('Standard Plan', 'Valid for 3 months support', null)).toBe(3)
      expect(extractPlanDurationMonths('Custom Plan', 'Annual business contract', null)).toBe(12)
    })

    it('returns 0 when no duration information is present', () => {
      expect(extractPlanDurationMonths('Custom Department Plan', '', null)).toBe(0)
    })
  })
})

