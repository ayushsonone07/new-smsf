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
      ? '/onboarding-dashboard-head-departmentUser'
      : '/onboarding-dashboard-head'
  }

  return isUser
    ? `/onboarding-dashboard-head-departmentUser-${normalizedSlug}`
    : `/onboarding-dashboard-head-${normalizedSlug}`
}

export function resolveSlugFromPath(
  pathname: string,
  portalRole?: HeadRole | string,
): string {
  const p = pathname.replace(/\/+$/, '')

  if (
    p === '/onboarding' ||
    p === '/onboarding-dashboard-head' ||
    p === '/onboarding-dashboard-head-departmentUser'
  ) {
    return 'dashboard'
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

