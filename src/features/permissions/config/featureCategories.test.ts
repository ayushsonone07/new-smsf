import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_COLUMN_TEMPLATE,
  FEATURE_CATEGORIES,
  USER_COLUMN_TEMPLATE,
  categoryMeta,
  columnsByFeature,
} from './featureCategories'
import type { FeaturePermission } from '../types/permission.types'

function feature(overrides: Partial<FeaturePermission>): FeaturePermission {
  return {
    id: 'f1',
    departmentId: 'dept-1',
    name: 'Phone',
    description: '',
    enabled: true,
    roleAPermission: 'CAN_EDIT',
    roleBPermission: 'CAN_READ',
    screen: 'customers',
    slug: 'customers',
    icon: 'list',
    order: 1,
    category: 'customers',
    kind: 'column',
    columnKey: 'phone',
    ...overrides,
  }
}

describe('feature categories', () => {
  it('resolves a known category', () => {
    expect(categoryMeta('customers').key).toBe('customers')
    expect(categoryMeta('users').key).toBe('users')
  })

  it('falls back to the first category for an unknown key', () => {
    expect(categoryMeta('unknown' as never)).toBe(FEATURE_CATEGORIES[0])
  })

  it('includes the customer and user column templates', () => {
    expect(CUSTOMER_COLUMN_TEMPLATE.map((column) => column.columnKey)).toContain('actions')
    expect(USER_COLUMN_TEMPLATE.map((column) => column.columnKey)).toContain('attendance')
    expect(CUSTOMER_COLUMN_TEMPLATE.find((c) => c.columnKey === 'actions')?.roleBDefault).toBe(
      'CAN_READ',
    )
  })
})

describe('columnsByFeature', () => {
  it('indexes column features by key for the requested category', () => {
    const phone = feature({ id: 'phone', columnKey: 'phone' })
    const email = feature({ id: 'email', columnKey: 'email' })
    const userPhone = feature({ id: 'u-phone', category: 'users', columnKey: 'phone' })
    const screen = feature({ id: 'screen', kind: 'screen', columnKey: undefined })

    const result = columnsByFeature(
      [phone, email, userPhone, screen],
      'customers',
    )

    expect(result).toEqual({ phone, email })
  })

  it('returns an empty map when there are no matching columns', () => {
    expect(columnsByFeature([], 'users')).toEqual({})
  })
})
