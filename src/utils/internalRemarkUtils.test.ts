import { describe, expect, it } from 'vitest'
import {
  extractLatestFromRemarksData,
  getLatestInternalRemark,
  getLatestServiceInternalRemark,
} from './internalRemarkUtils'

describe('extractLatestFromRemarksData', () => {
  it('returns an empty string for empty input', () => {
    expect(extractLatestFromRemarksData(undefined)).toBe('')
    expect(extractLatestFromRemarksData(null)).toBe('')
    expect(extractLatestFromRemarksData('   ')).toBe('')
  })

  it('returns a plain remark string trimmed', () => {
    expect(extractLatestFromRemarksData('  Please call back  ')).toBe('Please call back')
  })

  it('parses a JSON string before reading it', () => {
    expect(extractLatestFromRemarksData('{"remark":"From JSON"}')).toBe('From JSON')
  })

  it('ignores tag bookkeeping entries', () => {
    expect(extractLatestFromRemarksData('Tag added by system')).toBe('')
  })

  it('reads the latest entry from an array', () => {
    expect(extractLatestFromRemarksData(['first', 'latest'])).toBe('latest')
    expect(
      extractLatestFromRemarksData([
        { remark: 'first' },
        { remark: 'latest' },
      ]),
    ).toBe('latest')
  })

  it('prefers a nested data object', () => {
    expect(
      extractLatestFromRemarksData({
        data: { remark: 'Nested data remark', dateTime: '2026-01-01' },
        remark: 'outer',
      }),
    ).toBe('Nested data remark')
  })

  it('reads nested internalRemark arrays', () => {
    expect(
      extractLatestFromRemarksData({
        internalRemark: [{ remark: 'old' }, { remark: 'newest' }],
      }),
    ).toBe('newest')
  })

  it('reads the legacy key-as-text timestamp map', () => {
    expect(
      extractLatestFromRemarksData([
        { 'Customer asked for a callback': '2026-06-24T13:43:37' },
      ]),
    ).toBe('Customer asked for a callback')
  })
})

describe('getLatestServiceInternalRemark', () => {
  it('returns null when there are no services', () => {
    expect(getLatestServiceInternalRemark({})).toBeNull()
    expect(getLatestServiceInternalRemark(null)).toBeNull()
  })

  it('reads the matching service internal remark', () => {
    const customer = {
      services: [
        { serviceType: 'SALES_DEPARTMENT', internalRemark: 'sales note' },
        { serviceType: 'ONBOARDING_DEPARTMENT', internalRemark: 'onboarding note' },
      ],
    }
    expect(getLatestServiceInternalRemark(customer, ['ONBOARDING_DEPARTMENT'])).toBe(
      'onboarding note',
    )
  })

  it('returns null when no service matches the requested type', () => {
    const customer = {
      services: [{ serviceType: 'SALES_DEPARTMENT', internalRemark: 'sales note' }],
    }
    expect(getLatestServiceInternalRemark(customer, ['ONBOARDING_DEPARTMENT'])).toBeNull()
  })

  it('falls back to service remarks and description', () => {
    expect(
      getLatestServiceInternalRemark(
        { services: [{ serviceType: 'ONBOARDING_DEPARTMENT', remarks: [{ remark: 'from remarks' }] }] },
        ['ONBOARDING_DEPARTMENT'],
      ),
    ).toBe('from remarks')
    expect(
      getLatestServiceInternalRemark(
        { services: [{ serviceType: 'ONBOARDING_DEPARTMENT', description: 'from description' }] },
        ['ONBOARDING_DEPARTMENT'],
      ),
    ).toBe('from description')
  })
})

describe('getLatestInternalRemark', () => {
  it('returns null for a non-object customer', () => {
    expect(getLatestInternalRemark(null)).toBeNull()
    expect(getLatestInternalRemark('customer')).toBeNull()
  })

  it('reads a department scoped remark from customer details', () => {
    expect(
      getLatestInternalRemark(
        { customerDetails: { googleDepartmentRemark: 'google scoped note' } },
        ['GOOGLE_DEPARTMENT'],
      ),
    ).toBe('google scoped note')
  })

  it('reads a department scoped remark from the customer root', () => {
    expect(
      getLatestInternalRemark(
        { onboarding_DepartmentRemark: 'onboarding scoped note' },
        ['ONBOARDING_DEPARTMENT'],
      ),
    ).toBe('onboarding scoped note')
  })

  it('reads remarks from the matching service', () => {
    expect(
      getLatestInternalRemark(
        {
          services: [
            { serviceType: 'ONBOARDING_DEPARTMENT', internalRemark: 'service note' },
          ],
        },
        ['ONBOARDING_DEPARTMENT'],
      ),
    ).toBe('service note')
  })

  it('reads top-level remarks and description', () => {
    expect(
      getLatestInternalRemark({ remarks: [{ remark: 'top level remark' }] }),
    ).toBe('top level remark')
    expect(
      getLatestInternalRemark({ description: { remark: 'from description' } }),
    ).toBe('from description')
  })

  it('reads an explicit top-level internal remark', () => {
    expect(getLatestInternalRemark({ internalRemark: 'explicit note' })).toBe('explicit note')
  })

  it('reads an explicit remark from customer details', () => {
    expect(
      getLatestInternalRemark({
        customerDetails: { internalRemark: 'details note' },
      }),
    ).toBe('details note')
  })

  it('ignores tag bookkeeping remarks', () => {
    expect(getLatestInternalRemark({ internalRemark: 'Tag added' })).toBeNull()
  })

  it('returns null when no remark exists', () => {
    expect(getLatestInternalRemark({ id: 1, name: 'Customer' })).toBeNull()
  })
})
