import type { HeadRole } from '../types/head.types'
import { normalizeDepartmentSlug } from '../../../../api/dynamic-permission.api'

const STATIC_TOP_LEVEL_PATHS = new Set([
  'admin',
  'head',
  'users',
  'customers',
  'login',
  'forbidden',
  'services',
  'onboarding',
  'profile-update',
  'customer-details',
  'departments',
  'google-head',
  'google-user',
  'google',
])

export function resolveDeptFromPath(pathname?: string): string | null {
  if (typeof window === 'undefined' && !pathname) return null
  const p = (pathname || window.location.pathname).replace(/\/+$/, '')
  const first = p.replace(/^\/+/, '').split('/')[0]
  if (!first) return null
  const lower = first.toLowerCase()
  if (STATIC_TOP_LEVEL_PATHS.has(lower) || lower.startsWith('onboarding-')) {
    return null
  }
  return first
}

export function isUserOnboarding(departmentType?: string | null): boolean {
  if (departmentType && departmentType.toUpperCase().includes('ONBOARDING')) {
    return true
  }
  if (typeof window !== 'undefined') {
    const p = window.location.pathname.toLowerCase()
    if (p.startsWith('/onboarding') || p.startsWith('/onboarding-')) {
      return true
    }
  }
  return false
}

export function buildOnboardingRoute(slug: string, role?: string): string {
  const isUser = role === 'USER'
  const normalizedSlug = slug === 'customer-list' ? 'customers' : slug

  if (normalizedSlug === 'dashboard') {
    return isUser
      ? '/onboarding-user'
      : '/onboarding-dashboard-head'
  }

  return isUser
    ? `/onboarding-dashboard-head-departmentUser-${normalizedSlug}`
    : `/onboarding-dashboard-head-${normalizedSlug}`
}

export function isUserGoogle(departmentType?: string | null): boolean {
  if (departmentType && departmentType.toUpperCase().includes('GOOGLE')) {
    return true
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/google-head') ||
     window.location.pathname.startsWith('/google-user') ||
     window.location.pathname.startsWith('/google'))
  ) {
    return true
  }
  return false
}

export function buildGoogleRoute(slug: string, role?: string): string {
  const isUser = role === 'USER'
  const normalizedSlug = slug === 'customer-list' ? 'customers' : slug
  const base = isUser ? '/google-user' : '/google-head'
  if (normalizedSlug === 'dashboard') {
    return base
  }
  return `${base}/${normalizedSlug}`
}

export function buildDepartmentRoute(
  slug: string,
  departmentType?: string | null,
  role?: string,
): string {
  if (isUserGoogle(departmentType)) {
    return buildGoogleRoute(slug, role)
  }
  if (isUserOnboarding(departmentType)) {
    return buildOnboardingRoute(slug, role)
  }
  const roleSegment = role?.toUpperCase() === 'USER' ? 'user' : 'head'
  const resolvedDept = departmentType || resolveDeptFromPath()
  if (resolvedDept) {
    const deptSlug = normalizeDepartmentSlug(resolvedDept)
    if (deptSlug && deptSlug !== 'head' && deptSlug !== 'users' && deptSlug !== 'department') {
      return `/${deptSlug}/${roleSegment}/${slug}`
    }
  }
  const basePath = role === 'USER' ? '/users' : '/head'
  return `${basePath}/${slug}`
}

export function resolveSlugFromPath(
  pathname: string,
  portalRole?: HeadRole | string,
): string {
  const p = pathname.replace(/\/+$/, '')

  if (p === '/google-user' || p === '/google-user/dashboard') {
    return 'dashboard'
  }

  if (p.startsWith('/google-user/')) {
    const s = p.replace('/google-user/', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (p.startsWith('/google-user-')) {
    const s = p.replace('/google-user-', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (p === '/google-head' || p === '/google-head/dashboard') {
    return 'dashboard'
  }

  if (p.startsWith('/google-head/')) {
    const s = p.replace('/google-head/', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (p.startsWith('/google-head-')) {
    const s = p.replace('/google-head-', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (
    p === '/onboarding' ||
    p === '/onboarding-dashboard-head' ||
    p === '/onboarding-dashboard-head-departmentUser' ||
    p === '/onboarding-user'
  ) {
    return 'dashboard'
  }

  if (p.startsWith('/onboarding-user/')) {
    const s = p.replace('/onboarding-user/', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (p.startsWith('/onboarding-dashboard-head-departmentUser-')) {
    const s = p.replace('/onboarding-dashboard-head-departmentUser-', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (p.startsWith('/onboarding-dashboard-head-')) {
    const s = p.replace('/onboarding-dashboard-head-', '')
    return s === 'customer-list' ? 'customers' : s
  }

  if (p.startsWith('/onboarding/')) {
    const s = p.replace('/onboarding/', '')
    return s === 'customer-list' ? 'customers' : s
  }

  const segments = p.replace(/^\/+|\/+$/g, '').split('/')
  if (segments.length >= 3) {
    const last = segments[segments.length - 1]
    return last === 'customer-list' ? 'customers' : last
  } else if (segments.length === 2) {
    const second = segments[1]
    if (second === 'head' || second === 'user') {
      return 'dashboard'
    }
    return second === 'customer-list' ? 'customers' : second
  } else if (segments.length === 1 && segments[0] && segments[0] !== 'head' && segments[0] !== 'users') {
    return 'dashboard'
  }

  const basePath = portalRole === 'USER' ? '/users' : '/head'
  const s =
    p.replace(new RegExp(`^${basePath}/?`), '').split('/')[0] || 'dashboard'
  return s === 'customer-list' ? 'customers' : s
}

