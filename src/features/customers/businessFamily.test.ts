import { describe, expect, it } from 'vitest'
import { businessFamilyRole } from './businessFamily'

describe('businessFamilyRole', () => {
  it('marks a linked business with its main business name', () => {
    expect(businessFamilyRole({ isLinkedBusiness: true, parentCustomerId: 101, parentBusinessName: 'Ramesh Bakery' }))
      .toEqual({ kind: 'linked', parentId: 101, parentName: 'Ramesh Bakery' })
  })

  it('still marks a linked business when only the parent id is sent', () => {
    expect(businessFamilyRole({ parentCustomerId: 101 })).toEqual({ kind: 'linked', parentId: 101, parentName: 'Customer #101' })
  })

  it('marks a main business with its duplicates and lists old-style duplicate names', () => {
    expect(businessFamilyRole({
      isLinkedBusiness: false,
      parentCustomerId: null,
      duplicateCount: 3,
      duplicateCustomers: [{ businessName: 'Old Shop' }, { businessName: '' }, {}],
    })).toEqual({ kind: 'main', duplicateCount: 3, oldDuplicateNames: ['Old Shop'] })
  })

  it('treats a customer with no duplicates as single', () => {
    expect(businessFamilyRole({ isLinkedBusiness: false, parentCustomerId: null, duplicateCount: 0, duplicateCustomers: [] }))
      .toEqual({ kind: 'single' })
    expect(businessFamilyRole({})).toEqual({ kind: 'single' })
  })
})
