import { describe, expect, it } from 'vitest'
import {
  USER_TABLE_COLUMN_KEYS,
  resolveUserColumnKey,
} from './userColumnMatch'

describe('USER_TABLE_COLUMN_KEYS', () => {
  it('lists the fixed columns in render order', () => {
    expect(USER_TABLE_COLUMN_KEYS).toEqual([
      'name',
      'phone',
      'email',
      'role',
      'target',
      'achieved',
      'attendance',
      'actions',
    ])
  })
})

describe('resolveUserColumnKey', () => {
  it('returns null for empty names', () => {
    expect(resolveUserColumnKey()).toBeNull()
    expect(resolveUserColumnKey(null)).toBeNull()
    expect(resolveUserColumnKey('   ')).toBeNull()
  })

  it('resolves the canonical column keys', () => {
    for (const key of USER_TABLE_COLUMN_KEYS) {
      expect(resolveUserColumnKey(key)).toBe(key)
    }
  })

  it('normalizes case, spacing and punctuation', () => {
    expect(resolveUserColumnKey('  FULL NAME ')).toBe('name')
    expect(resolveUserColumnKey('Phone-Number')).toBe('phone')
    expect(resolveUserColumnKey('E mail')).toBe('email')
    expect(resolveUserColumnKey('Monthly_Target')).toBe('target')
    expect(resolveUserColumnKey('achievement %')).toBe('achieved')
    expect(resolveUserColumnKey('P/A Days')).toBe('attendance')
  })

  it('resolves known backend aliases', () => {
    expect(resolveUserColumnKey('username')).toBe('name')
    expect(resolveUserColumnKey('employee name')).toBe('name')
    expect(resolveUserColumnKey('mobile')).toBe('phone')
    expect(resolveUserColumnKey('contact number')).toBe('phone')
    expect(resolveUserColumnKey('email id')).toBe('email')
    expect(resolveUserColumnKey('designation')).toBe('role')
    expect(resolveUserColumnKey('goal')).toBe('target')
    expect(resolveUserColumnKey('progress')).toBe('achieved')
    expect(resolveUserColumnKey('present days')).toBe('attendance')
    expect(resolveUserColumnKey('operations')).toBe('actions')
  })

  it('returns null for unknown columns', () => {
    expect(resolveUserColumnKey('salary')).toBeNull()
    expect(resolveUserColumnKey('random-column')).toBeNull()
  })
})
