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
  if (slug.startsWith('/')) return slug
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
  // The authenticated session department passed by callers is authoritative.
  // The URL is only a fallback for admin previews or legacy links.
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

export interface NormalizedRouteResult {
  normalized: string
  wasAutoConverted: boolean
  originalCleaned: string
  screenSlug: string
  role: 'head' | 'user'
}

/**
 * Smart URL Parser & Route Normalizer.
 * Takes any browser URL (e.g. http://localhost:5173/onboarding-dashboard-head-meeting,
 * /onboarding-dashboard-head, /head/meeting, etc.) and auto-converts it into the
 * clean standard DB format: /{departmentSlug}/{role}/{screenSlug}.
 */
export function normalizeInputRoute(
  rawInput: string,
  departmentType: string = 'ONBOARDING_DEPARTMENT',
): NormalizedRouteResult {
  if (!rawInput) {
    return {
      normalized: '',
      wasAutoConverted: false,
      originalCleaned: '',
      screenSlug: '',
      role: 'head',
    }
  }

  let cleaned = rawInput.trim()

  // 1. Remove protocol and host if full URL pasted (e.g. http://localhost:5173/...)
  cleaned = cleaned.replace(/^https?:\/\/[^/]+/i, '')

  // 2. Remove query params and hashes (e.g. ?page=1 or #section)
  cleaned = cleaned.split('?')[0].split('#')[0]

  // 3. Remove leading and trailing slashes
  cleaned = cleaned.replace(/^\/+|\/+$/g, '')

  if (!cleaned) {
    return {
      normalized: '',
      wasAutoConverted: false,
      originalCleaned: rawInput.trim(),
      screenSlug: '',
      role: 'head',
    }
  }

  const deptSlug = normalizeDepartmentSlug(departmentType) || 'onboarding_department'

  // If user already wrote standard format: e.g. "onboarding_department/head/meeting"
  const standardPrefixHead = `${deptSlug}/head/`
  const standardPrefixUser = `${deptSlug}/user/`
  if (cleaned.startsWith(standardPrefixHead) || cleaned.startsWith(standardPrefixUser)) {
    const isUser = cleaned.startsWith(standardPrefixUser)
    const slug = cleaned.replace(isUser ? standardPrefixUser : standardPrefixHead, '')
    return {
      normalized: `/${cleaned}`,
      wasAutoConverted: rawInput.trim() !== `/${cleaned}`,
      originalCleaned: cleaned,
      screenSlug: slug,
      role: isUser ? 'user' : 'head',
    }
  }

  // 4. Handle legacy onboarding URLs like "onboarding-dashboard-head-meeting", "onboarding-dashboard-head", etc.
  const lower = cleaned.toLowerCase()
  let role: 'head' | 'user' = 'head'
  let screenSlug = ''

  if (
    lower.includes('departmentuser') ||
    lower.includes('onboarding-user') ||
    lower.includes('/user/') ||
    lower.startsWith('user/')
  ) {
    role = 'user'
  }

  if (
    lower === 'onboarding' ||
    lower === 'onboarding-dashboard-head' ||
    lower === 'onboarding-dashboard-head-departmentuser' ||
    lower === 'onboarding-user' ||
    lower === 'dashboard'
  ) {
    screenSlug = 'dashboard'
  } else if (lower.startsWith('onboarding-dashboard-head-departmentuser-')) {
    screenSlug = lower.replace('onboarding-dashboard-head-departmentuser-', '')
  } else if (lower.startsWith('onboarding-dashboard-head-')) {
    screenSlug = lower.replace('onboarding-dashboard-head-', '')
  } else if (lower.startsWith('onboarding-user/')) {
    screenSlug = lower.replace('onboarding-user/', '')
  } else if (lower.startsWith('head/')) {
    role = 'head'
    screenSlug = lower.replace('head/', '')
  } else if (lower.startsWith('user/') || lower.startsWith('users/')) {
    role = 'user'
    screenSlug = lower.replace(/^(user|users)\//, '')
  } else {
    // If it's a path like "my-dept/head/meeting"
    const segments = lower.split('/')
    if (segments.length >= 3) {
      role = segments[1] === 'user' ? 'user' : 'head'
      screenSlug = segments[2]
    } else if (segments.length === 2) {
      role = segments[0] === 'user' ? 'user' : 'head'
      screenSlug = segments[1]
    } else {
      screenSlug = segments[0]
    }
  }

  // Normalize screenSlug aliases
  if (screenSlug === 'customer-list') {
    screenSlug = 'customers'
  } else if (screenSlug === 'department-user' || screenSlug === 'department-users') {
    screenSlug = 'users'
  } else if (screenSlug === 'help-support') {
    screenSlug = 'help-center'
  } else if (
    screenSlug === '15-days-meeting' ||
    screenSlug === '15-days-meetings' ||
    screenSlug === '15-day-meeting'
  ) {
    screenSlug = 'meeting'
  }

  const result = `/${deptSlug}/${role}/${screenSlug}`
  const wasConverted = rawInput.trim() !== result

  return {
    normalized: result,
    wasAutoConverted: wasConverted,
    originalCleaned: cleaned,
    screenSlug,
    role,
  }
}

