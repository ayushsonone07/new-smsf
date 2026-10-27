import { describe, expect, it } from 'vitest'
import { buildDepartmentRoute, normalizeInputRoute } from './routeUtils'

describe('normalizeInputRoute', () => {
  it('builds {department}/{screen} without the role', () => {
    expect(normalizeInputRoute('Customer List', 'SALES_DEPARTMENT').normalized).toBe('sales/customers')
    expect(normalizeInputRoute('/sales/head/meeting', 'SALES_DEPARTMENT').normalized).toBe('sales/meeting')
    expect(normalizeInputRoute('/sales/user/sop', 'SALES_DEPARTMENT').normalized).toBe('sales/sop')
  })

  it('accepts a full pasted URL', () => {
    const r = normalizeInputRoute('http://localhost:5173/sales/user/help-center?tab=2', 'SALES_DEPARTMENT')
    expect(r.normalized).toBe('sales/help-center')
    expect(r.role).toBe('user')
  })

  it('keeps a name that is already standard', () => {
    const r = normalizeInputRoute('sales/leads', 'SALES_DEPARTMENT')
    expect(r.normalized).toBe('sales/leads')
    expect(r.wasAutoConverted).toBe(false)
  })
})

describe('buildDepartmentRoute', () => {
  it('adds the session role only to the browser URL', () => {
    expect(buildDepartmentRoute('leads', 'SALES_DEPARTMENT', 'HEAD')).toBe('/sales/head/leads')
    expect(buildDepartmentRoute('leads', 'SALES_DEPARTMENT', 'USER')).toBe('/sales/user/leads')
  })
})
