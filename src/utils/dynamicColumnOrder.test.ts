import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyDynamicColumnOrder,
  readDynamicColumnOrder,
  saveDynamicColumnOrder,
} from './dynamicColumnOrder'

beforeEach(() => {
  localStorage.clear()
})

describe('readDynamicColumnOrder', () => {
  it('returns an empty list when nothing is saved', () => {
    expect(readDynamicColumnOrder('SALES_DEPARTMENT', 'route-1')).toEqual([])
  })

  it('ignores corrupt or non-string entries', () => {
    localStorage.setItem(
      'smsf.dynamic-column-order:SALES_DEPARTMENT:route-1',
      JSON.stringify(['a', 1, null, 'b']),
    )
    expect(readDynamicColumnOrder('SALES_DEPARTMENT', 'route-1')).toEqual(['a', 'b'])

    localStorage.setItem('smsf.dynamic-column-order:SALES_DEPARTMENT:route-1', '{oops')
    expect(readDynamicColumnOrder('SALES_DEPARTMENT', 'route-1')).toEqual([])
  })

  it('scopes the order per department and route', () => {
    saveDynamicColumnOrder('SALES_DEPARTMENT', 'route-1', ['a', 'b'])
    expect(readDynamicColumnOrder('SALES_DEPARTMENT', 'route-1')).toEqual(['a', 'b'])
    expect(readDynamicColumnOrder('GOOGLE_DEPARTMENT', 'route-1')).toEqual([])
    expect(readDynamicColumnOrder('SALES_DEPARTMENT', 'route-2')).toEqual([])
  })
})

describe('applyDynamicColumnOrder', () => {
  const columns = [
    { columnId: 'a' },
    { columnId: 'b' },
    { columnId: 'c' },
  ]

  it('returns the original order when there is no saved order', () => {
    expect(applyDynamicColumnOrder(columns, [])).toEqual(columns)
  })

  it('applies the saved order', () => {
    expect(applyDynamicColumnOrder(columns, ['c', 'a', 'b'])).toEqual([
      { columnId: 'c' },
      { columnId: 'a' },
      { columnId: 'b' },
    ])
  })

  it('keeps columns missing from the saved order at the end in their original order', () => {
    expect(applyDynamicColumnOrder(columns, ['c'])).toEqual([
      { columnId: 'c' },
      { columnId: 'a' },
      { columnId: 'b' },
    ])
  })

  it('ignores saved ids that no longer exist', () => {
    expect(applyDynamicColumnOrder(columns, ['removed', 'b'])).toEqual([
      { columnId: 'b' },
      { columnId: 'a' },
      { columnId: 'c' },
    ])
  })
})
