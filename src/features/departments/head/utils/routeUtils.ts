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

/**
 * URL standard for every department portal (Onboarding, Google and dynamic ones):
 *   /{dept}-head            -> Head dashboard
 *   /{dept}-head/{screen}   -> Head screen
 *   /{dept}-user            -> User dashboard
 *   /{dept}-user/{screen}   -> User screen
 * {dept} is the department slug (ONBOARDING_DEPARTMENT -> onboarding).
 * The DB route name stays `{dept}/{screen}` — the role only lives in the URL.
 */
const PORTAL_SEGMENT = /^([a-z0-9_]+)-(head|user)$/i

export function parsePortalSegment(
  segment: string,
): { dept: string; role: 'HEAD' | 'USER' } | null {
  const match = PORTAL_SEGMENT.exec(segment)
  if (!match) return null
  return { dept: match[1].toLowerCase(), role: match[2].toLowerCase() === 'user' ? 'USER' : 'HEAD' }
}

/** HEAD / USER from a `/{dept}-head|user/...` URL, or null for other URLs. */
export function resolvePortalRoleFromPath(pathname: string): 'HEAD' | 'USER' | null {
  const first = pathname.replace(/^\/+/, '').split('/')[0] || ''
  return parsePortalSegment(first)?.role ?? null
}

/**
 * Maps old portal URLs to the standard one, or null when the URL is already standard:
 *   /onboarding-dashboard-head-departmentUser-meeting -> /onboarding-user/meeting
 *   /onboarding-dashboard-head-meeting                -> /onboarding-head/meeting
 *   /onboarding, /onboarding/meeting                  -> /onboarding-head[/meeting]
 *   /sales/head/leads, /sales/user                    -> /sales-head/leads, /sales-user
 */
export function legacyToStandardPath(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '')
  const lower = p.toLowerCase()
  const withScreen = (base: string, screen: string) =>
    !screen || screen === 'dashboard' ? base : `${base}/${screen === 'customer-list' ? 'customers' : screen}`

  const userPrefix = '/onboarding-dashboard-head-departmentuser'
  if (lower === userPrefix || lower.startsWith(`${userPrefix}-`)) {
    return withScreen('/onboarding-user', p.slice(userPrefix.length + 1))
  }
  const headPrefix = '/onboarding-dashboard-head'
  if (lower === headPrefix || lower.startsWith(`${headPrefix}-`)) {
    return withScreen('/onboarding-head', p.slice(headPrefix.length + 1))
  }
  if (lower === '/onboarding' || lower.startsWith('/onboarding/')) {
    return withScreen('/onboarding-head', p.slice('/onboarding/'.length))
  }

  const segments = p.replace(/^\/+/, '').split('/')
  const [dept, role, screen] = segments
  if (
    segments.length >= 2 &&
    segments.length <= 3 &&
    (role === 'head' || role === 'user') &&
    dept &&
    !STATIC_TOP_LEVEL_PATHS.has(dept.toLowerCase())
  ) {
    return withScreen(`/${dept.toLowerCase()}-${role}`, screen ?? '')
  }
  return null
}

export function resolveDeptFromPath(pathname?: string): string | null {
  if (typeof window === 'undefined' && !pathname) return null
  const p = (pathname || window.location.pathname).replace(/\/+$/, '')
  const first = p.replace(/^\/+/, '').split('/')[0]
  if (!first) return null
  const lower = first.toLowerCase()
  const portal = parsePortalSegment(lower)
  if (portal) {
    // Onboarding / Google keep their own detection (isUserOnboarding / isUserGoogle).
    return portal.dept === 'onboarding' || portal.dept === 'google' ? null : portal.dept
  }
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

/** /{dept}-head[/{screen}] or /{dept}-user[/{screen}] — the one URL standard. */
function buildPortalRoute(deptSlug: string, slug: string, role?: string): string {
  const roleSegment = role?.toUpperCase() === 'USER' ? 'user' : 'head'
  const normalizedSlug = slug === 'customer-list' ? 'customers' : slug
  const base = `/${deptSlug}-${roleSegment}`
  return normalizedSlug === 'dashboard' ? base : `${base}/${normalizedSlug}`
}

export function buildOnboardingRoute(slug: string, role?: string): string {
  if (slug.startsWith('/')) return slug
  return buildPortalRoute('onboarding', slug, role)
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
  return buildPortalRoute('google', slug, role)
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
  // The authenticated session department passed by callers is authoritative.
  // The URL is only a fallback for admin previews or legacy links.
  const resolvedDept = departmentType || resolveDeptFromPath()
  if (resolvedDept) {
    const deptSlug = normalizeDepartmentSlug(resolvedDept)
    if (deptSlug && deptSlug !== 'head' && deptSlug !== 'users' && deptSlug !== 'department') {
      return buildPortalRoute(deptSlug, slug, role)
    }
  }
  const basePath = role === 'USER' ? '/users' : '/head'
  return `${basePath}/${slug}`
}

export function resolveSlugFromPath(
  pathname: string,
  portalRole?: HeadRole | string,
): string {
  // Old URLs resolve through their standard form.
  const p = (legacyToStandardPath(pathname) ?? pathname).replace(/\/+$/, '')

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
 * /onboarding/head/meeting, /head/meeting, etc.) and auto-converts it into the
 * standard DB route name: {departmentSlug}/{screenSlug}.
 * The role is not part of the route name — one route serves both Head and User;
 * the role only appears in the browser URL (see buildDepartmentRoute).
 * `role` in the result is the role found in a pasted URL, for display only.
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

  // Already in standard format: e.g. "onboarding/meeting"
  const standardSegments = cleaned.split('/')
  if (standardSegments.length === 2 && standardSegments[0] === deptSlug) {
    return {
      normalized: cleaned,
      wasAutoConverted: rawInput.trim() !== cleaned,
      originalCleaned: cleaned,
      screenSlug: standardSegments[1],
      role: 'head',
    }
  }

  // 4. Handle legacy onboarding URLs like "onboarding-dashboard-head-meeting", "onboarding-dashboard-head", etc.
  const lower = cleaned.toLowerCase()
  let role: 'head' | 'user' = 'head'
  let screenSlug: string

  if (
    lower.includes('departmentuser') ||
    lower.includes('onboarding-user') ||
    lower.includes('/user/') ||
    lower.startsWith('user/')
  ) {
    role = 'user'
  }

  const firstSegment = lower.split('/')[0]
  const portal = parsePortalSegment(firstSegment)
  if (portal) role = portal.role === 'USER' ? 'user' : 'head'

  if (portal && !lower.includes('/')) {
    // "onboarding-head" / "sales-user" -> dashboard
    screenSlug = 'dashboard'
  } else if (portal) {
    // "onboarding-head/meeting" -> meeting
    screenSlug = lower.split('/')[1]
  } else if (
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

  // Same slug rule as the backend (DynamicPermissionService.buildRouteName): "Customer List" -> "customer-list"
  screenSlug = screenSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

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

  const result = `${deptSlug}/${screenSlug}`
  const wasConverted = rawInput.trim() !== result

  return {
    normalized: result,
    wasAutoConverted: wasConverted,
    originalCleaned: cleaned,
    screenSlug,
    role,
  }
}

