import { describe, expect, it } from 'vitest'
import { uniqueDepartmentHeads } from './departmentHeads'
import type { Department } from '../types/department.types'

function makeDepartment(overrides: Partial<Department>): Department {
  return {
    id: '1',
    name: 'Department',
    type: 'Sales',
    username: 'user',
    email: 'user@example.com',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    role: 'DEPARTMENT_HEAD',
    ...overrides,
  }
}

describe('uniqueDepartmentHeads', () => {
  it('returns an empty list for no departments', () => {
    expect(uniqueDepartmentHeads([])).toEqual([])
  })

  it('returns one head per department type', () => {
    const firstSalesHead = makeDepartment({ id: '1', type: 'Sales' })
    const secondSalesHead = makeDepartment({ id: '2', type: 'Sales' })
    const supportHead = makeDepartment({ id: '3', type: 'Support' })

    expect(
      uniqueDepartmentHeads([firstSalesHead, secondSalesHead, supportHead]),
    ).toEqual([firstSalesHead, supportHead])
  })

  it('ignores non-head departments', () => {
    const head = makeDepartment({ id: '1', type: 'Sales' })
    const regularUser = makeDepartment({ id: '2', type: 'Sales', role: 'DEPARTMENT_USER' })

    expect(uniqueDepartmentHeads([regularUser, head])).toEqual([head])
  })

  it('groups departments without a type under the unknown key', () => {
    const first = makeDepartment({ id: '1', type: undefined })
    const second = makeDepartment({ id: '2', type: undefined })

    expect(uniqueDepartmentHeads([first, second])).toEqual([first])
  })
})
