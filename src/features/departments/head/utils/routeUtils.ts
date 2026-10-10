import type { HeadRole } from '../types/head.types'

export function isUserOnboarding(departmentType?: string | null): boolean {
  if (!departmentType) return true
  return departmentType.toUpperCase().includes('ONBOARDING')
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
     window.location.pathname.startsWith('/google'))
  ) {
    return true
  }
  return false
}

export function buildGoogleRoute(slug: string, _role?: string): string {
  const normalizedSlug = slug === 'customer-list' ? 'customers' : slug
  if (normalizedSlug === 'dashboard') {
    return '/google-head'
  }
  return `/google-head/${normalizedSlug}`
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
  const basePath = role === 'USER' ? '/users' : '/head'
  const normalizedSlug = slug === 'customer-list' ? 'customers' : slug
  return `${basePath}/${normalizedSlug}`
}

export function resolveSlugFromPath(
  pathname: string,
  portalRole?: HeadRole | string,
): string {
  const p = pathname.replace(/\/+$/, '')

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

  const basePath = portalRole === 'USER' ? '/users' : '/head'
  const s =
    p.replace(new RegExp(`^${basePath}/?`), '').split('/')[0] || 'dashboard'
  return s === 'customer-list' ? 'customers' : s
}

