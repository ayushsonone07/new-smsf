import { describe, expect, it } from 'vitest'
import {
  buildDepartmentRoute,
  legacyToStandardPath,
  normalizeInputRoute,
  resolveDeptFromPath,
  resolvePortalRoleFromPath,
  resolveSlugFromPath,
} from './routeUtils'

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

  it('accepts the /{dept}-head|user/{screen} URL', () => {
    const r = normalizeInputRoute('http://localhost:5173/onboarding-user/meeting', 'ONBOARDING_DEPARTMENT')
    expect(r.normalized).toBe('onboarding/meeting')
    expect(r.role).toBe('user')
    expect(normalizeInputRoute('/onboarding-head', 'ONBOARDING_DEPARTMENT').normalized).toBe('onboarding/dashboard')
    expect(normalizeInputRoute('/onboarding-dashboard-head-meeting', 'ONBOARDING_DEPARTMENT').normalized).toBe('onboarding/meeting')
  })

  it('keeps a name that is already standard', () => {
    const r = normalizeInputRoute('sales/leads', 'SALES_DEPARTMENT')
    expect(r.normalized).toBe('sales/leads')
    expect(r.wasAutoConverted).toBe(false)
  })
})

describe('buildDepartmentRoute', () => {
  it('uses /{dept}-{role}/{screen} for every department', () => {
    expect(buildDepartmentRoute('leads', 'SALES_DEPARTMENT', 'HEAD')).toBe('/sales-head/leads')
    expect(buildDepartmentRoute('leads', 'SALES_DEPARTMENT', 'USER')).toBe('/sales-user/leads')
    expect(buildDepartmentRoute('meeting', 'ONBOARDING_DEPARTMENT', 'HEAD')).toBe('/onboarding-head/meeting')
    expect(buildDepartmentRoute('users', 'ONBOARDING_DEPARTMENT', 'USER')).toBe('/onboarding-user/users')
    expect(buildDepartmentRoute('users', 'GOOGLE_DEPARTMENT', 'HEAD')).toBe('/google-head/users')
  })

  it('uses the bare portal for the dashboard', () => {
    expect(buildDepartmentRoute('dashboard', 'ONBOARDING_DEPARTMENT', 'HEAD')).toBe('/onboarding-head')
    expect(buildDepartmentRoute('dashboard', 'SALES_DEPARTMENT', 'USER')).toBe('/sales-user')
    expect(buildDepartmentRoute('customer-list', 'GOOGLE_DEPARTMENT', 'USER')).toBe('/google-user/customers')
  })
})

describe('reading the URL', () => {
  it('resolves screen, role and department', () => {
    expect(resolveSlugFromPath('/onboarding-head/meeting')).toBe('meeting')
    expect(resolveSlugFromPath('/onboarding-user')).toBe('dashboard')
    expect(resolveSlugFromPath('/sales-head/customer-list')).toBe('customers')
    expect(resolvePortalRoleFromPath('/sales-user/leads')).toBe('USER')
    expect(resolvePortalRoleFromPath('/google-head')).toBe('HEAD')
    expect(resolvePortalRoleFromPath('/admin')).toBeNull()
    expect(resolveDeptFromPath('/sales-head/leads')).toBe('sales')
    expect(resolveDeptFromPath('/onboarding-head/leads')).toBeNull()
    expect(resolveDeptFromPath('/google-user')).toBeNull()
  })

  it('still reads old URLs', () => {
    expect(resolveSlugFromPath('/onboarding-dashboard-head-departmentUser-sop')).toBe('sop')
    expect(resolveSlugFromPath('/onboarding-dashboard-head')).toBe('dashboard')
    expect(resolveSlugFromPath('/sales/head/leads')).toBe('leads')
  })
})

describe('legacyToStandardPath', () => {
  it('maps old onboarding and dynamic URLs to the standard', () => {
    expect(legacyToStandardPath('/onboarding-dashboard-head-meeting')).toBe('/onboarding-head/meeting')
    expect(legacyToStandardPath('/onboarding-dashboard-head')).toBe('/onboarding-head')
    expect(legacyToStandardPath('/onboarding-dashboard-head-departmentUser-users')).toBe('/onboarding-user/users')
    expect(legacyToStandardPath('/onboarding-dashboard-head-departmentUser')).toBe('/onboarding-user')
    expect(legacyToStandardPath('/onboarding-dashboard-head-customer-list')).toBe('/onboarding-head/customers')
    expect(legacyToStandardPath('/onboarding')).toBe('/onboarding-head')
    expect(legacyToStandardPath('/onboarding/sop')).toBe('/onboarding-head/sop')
    expect(legacyToStandardPath('/sales/head/leads')).toBe('/sales-head/leads')
    expect(legacyToStandardPath('/sales/user')).toBe('/sales-user')
    expect(legacyToStandardPath('/sales/head/dashboard')).toBe('/sales-head')
  })

  it('leaves standard and non-portal URLs alone', () => {
    expect(legacyToStandardPath('/onboarding-head/meeting')).toBeNull()
    expect(legacyToStandardPath('/onboarding-user')).toBeNull()
    expect(legacyToStandardPath('/google-head/users')).toBeNull()
    expect(legacyToStandardPath('/head/meeting')).toBeNull()
    expect(legacyToStandardPath('/admin/services')).toBeNull()
    expect(legacyToStandardPath('/customers/billing')).toBeNull()
  })
})
