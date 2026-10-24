import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import {
  isRouteMatch,
  useDepartmentRoutePermissions,
} from '../../../permissions/hooks/useDepartmentRoutePermissions'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission, HeadScreenKey } from '../../../permissions/types/permission.types'
import type { IconName } from '../../../../components/head/shared/iconPaths'
import { getSession } from '../../../../app/auth/session'
import { fetchAutomationCount } from '../../../../api/autowebsion.api'
import { normalizeDepartmentTypeName } from '../../../../api/dynamic-permission.api'
import {
  buildDepartmentRoute,
  buildGoogleRoute,
  buildOnboardingRoute,
  isUserGoogle,
  isUserOnboarding,
  resolveDeptFromPath,
} from '../utils/routeUtils'

const DEPARTMENT_USER_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'meeting', label: '15 Days Meeting', icon: 'calendar', slug: 'meeting', screen: 'meeting' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
]

const GOOGLE_HEAD_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'users', label: 'Department User', icon: 'users', slug: 'users', screen: 'users' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'analytics', label: 'Analytics', icon: 'bar', slug: 'analytics', screen: 'analytics' },
  { key: 'service-flow', label: 'Service Flow', icon: 'flow', slug: 'service-flow', screen: 'service-flow' },
  { key: 'member-flow', label: 'Member Flow', icon: 'perf', slug: 'member-flow', screen: 'member-flow' },
  { key: 'help-support', label: 'Help & Support', icon: 'help', slug: 'help-support', screen: 'help-support' },
]

const GOOGLE_USER_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'help-support', label: 'Help & Support', icon: 'help', slug: 'help-support', screen: 'help-support' },
]

const DYNAMIC_DEPARTMENT_HEAD_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'users', label: 'Department User', icon: 'users', slug: 'department-user', screen: 'department-user' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customer-list', screen: 'customer-list' },
  { key: 'billing', label: 'Billing List', icon: 'brief', slug: 'billing', screen: 'billing' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'service-flow', label: 'Service Flow', icon: 'flow', slug: 'service-flow', screen: 'service-flow' },
  { key: 'member-flow', label: 'Member Performance', icon: 'perf', slug: 'member-performance', screen: 'member-performance' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'analytics', label: 'Analytics', icon: 'bar', slug: 'analytics', screen: 'analytics' },
  { key: 'meeting', label: '15 Days Meeting', icon: 'calendar', slug: 'meeting', screen: 'meeting' },
  { key: 'sop', label: 'SOP', icon: 'book', slug: 'sop', screen: 'sop' },
  { key: 'help-support', label: 'Help & Support', icon: 'help', slug: 'help-support', screen: 'help-support' },
]

const ONBOARDING_HEAD_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'users', label: 'Department Users', icon: 'userPlus', slug: 'users', screen: 'users' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'meeting', label: '15 Days Meeting', icon: 'calendar', slug: 'meeting', screen: 'meeting' },
  { key: 'sop', label: 'SOP', icon: 'flow', slug: 'sop', screen: 'sop' },
  { key: 'help-center', label: 'Help Center', icon: 'help', slug: 'help-center', screen: 'help-center' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'leads', label: 'Leads', icon: 'tag', slug: 'leads', screen: 'leads' },
  { key: 'manage-services', label: 'Manage Services', icon: 'settings', slug: 'manage-services', screen: 'manage-services' },
  { key: 'salary-management', label: 'Salary Management', icon: 'trend', slug: 'salary-management', screen: 'salary-management' },
  { key: 'airtel-calls', label: 'My Airtel Calls', icon: 'phone', slug: 'airtel-calls', screen: 'airtel-calls' },
]

const ONBOARDING_USER_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'meeting', label: '15 Days Meeting', icon: 'calendar', slug: 'meeting', screen: 'meeting' },
  { key: 'sop', label: 'SOP', icon: 'flow', slug: 'sop', screen: 'sop' },
  { key: 'help-center', label: 'Help Center', icon: 'help', slug: 'help-center', screen: 'help-center' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'leads', label: 'Leads', icon: 'tag', slug: 'leads', screen: 'leads' },
  { key: 'salary-management', label: 'Salary Management', icon: 'trend', slug: 'salary-management', screen: 'salary-management' },
  { key: 'airtel-calls', label: 'My Airtel Calls', icon: 'phone', slug: 'airtel-calls', screen: 'airtel-calls' },
]

function extractCleanSlug(routeName: string): string {
  const trimmed = routeName
    .trim()
    .replace(/^(\/|#)+/, '')
    .replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const last = parts[parts.length - 1] || ''

  const cleanLast = last.toLowerCase().replace(/[\s_]+/g, '-')
  if (
    cleanLast === 'users' ||
    cleanLast === 'department-user' ||
    cleanLast === 'department-users' ||
    cleanLast === 'departmentuser' ||
    cleanLast === 'departmentusers'
  ) {
    return 'department-user'
  }

  if (
    cleanLast === 'customers' ||
    cleanLast === 'customer-list' ||
    cleanLast === 'all-customers' ||
    cleanLast === 'autowebision-customers'
  ) {
    return 'customer-list'
  }

  const cleaned = last
    .replace(
      /^(onboarding-dashboard-head-departmentuser|onboarding-dashboard-head|onboarding-user|google-head|google-user)[-/]/i,
      '',
    )
    .replace(/^(head|user|users)[-/]/i, '')
    .replace(/^(head|user|onboarding|google-head|google-user)$/i, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
  return cleaned || 'dashboard'
}

function formatRouteLabel(slugOrName: string): string {
  const cleaned = extractCleanSlug(slugOrName)
  if (cleaned === 'department-user' || cleaned === 'users') {
    return 'Department User'
  }
  if (cleaned === 'customer-list' || cleaned === 'customers') {
    return 'Customer List'
  }
  return cleaned
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Sidebar items for a department:
 * - For Department User: strictly [Dashboard, Attendance, Customer List, 15 Days Meeting, History] (+ custom DB routes)
 * - For Google Department Head: strictly [Dashboard, Department User, Customer List, History, Analytics, Service Flow, Member Flow, Help & Support]
 * - For Google Department User: strictly [Dashboard, Attendance, Customer List, History, Help & Support]
 * - For Onboarding Head: enabled feature permissions in admin-defined order
 * - For Dynamic / Other Departments: standard department screens + custom DB routes in `access_routes`
 * Filtered by live DB route visibility (if visibility is 0, item is not displayed).
 */
export function useHeadNav(departmentId: string, departmentType?: string) {
  const query = useDepartmentFeatures(departmentId)
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const rawDept = session?.user.departmentType || departmentType || deptFromUrl || undefined
  const isGoogle = isUserGoogle(rawDept)
  const isOnboarding = isUserOnboarding(rawDept)
  const effectiveDeptType = isGoogle ? 'GOOGLE_DEPARTMENT' : rawDept
  const role = session?.user.role
  const isUser = role === 'USER'
  const basePath = isUser ? '/users' : '/head'

  const routePerms = useDepartmentRoutePermissions(effectiveDeptType)

  const isAutowebsion = Boolean(
    effectiveDeptType && (
      normalizeDepartmentTypeName(effectiveDeptType) === 'AUTOWEBSION_DEPARTMENT' ||
      normalizeDepartmentTypeName(effectiveDeptType) === 'WEBSITE_DEPARTMENT' ||
      normalizeDepartmentTypeName(effectiveDeptType) === 'AUTOMATION_DEPARTMENT' ||
      effectiveDeptType.toUpperCase().includes('AUTOWEB') ||
      effectiveDeptType.toUpperCase().includes('WEBSITE') ||
      effectiveDeptType.toUpperCase().includes('AUTOMATION')
    ),
  )

  const automationCountQuery = useQuery({
    queryKey: ['userAutomationCountNav', session?.user?.email],
    queryFn: () => fetchAutomationCount(session?.user?.email),
    enabled: Boolean(isUser && isAutowebsion && session?.user?.email),
    staleTime: 60_000,
  })

  const features = useMemo<FeaturePermission[]>(() => {
    if (isGoogle) {
      const screensList = isUser ? GOOGLE_USER_SCREENS : GOOGLE_HEAD_SCREENS
      const baseGoogleFeatures: FeaturePermission[] = screensList
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            routePerms.isRouteEnabled(buildGoogleRoute(item.slug, role)),
        )
        .map((item, index) => {
          const existing = (query.data ?? []).find(
            (f) => f.slug === item.slug || f.screen === item.screen,
          )
          return {
            id: existing?.id ?? `google-feat-${item.slug}`,
            departmentId,
            name: item.label,
            description: existing?.description ?? item.label,
            enabled: true,
            userVisible: true,
            roleAPermission: existing?.roleAPermission ?? 'CAN_EDIT',
            roleBPermission: existing?.roleBPermission ?? 'CAN_READ',
            screen: item.screen,
            slug: item.slug,
            icon: item.icon,
            order: index,
            category: 'screens',
            kind: 'screen',
          }
        })

      if (routePerms.routes.length > 0) {
        const customGoogleFeatures: FeaturePermission[] = routePerms.routes
          .filter(
            (r) =>
              r.routeName &&
              routePerms.isRouteEnabled(r.routeName) &&
              !baseGoogleFeatures.some((f) => isRouteMatch(r, f.slug)),
          )
          .map((r, idx) => {
            const cleanSlug = extractCleanSlug(r.routeName)
            const matchedStd = screensList.find(
              (s) => s.slug === cleanSlug || isRouteMatch(r, s.slug),
            )
            return {
              id: `custom-route-${r.routeId || cleanSlug}`,
              departmentId,
              name: matchedStd?.label ?? formatRouteLabel(r.routeName),
              description: `Dynamic route (${r.routeName})`,
              enabled: true,
              userVisible: true,
              roleAPermission: 'CAN_EDIT',
              roleBPermission: 'CAN_READ',
              screen: matchedStd?.screen ?? 'custom',
              slug: matchedStd?.slug ?? cleanSlug,
              icon: matchedStd?.icon ?? 'brief',
              order: baseGoogleFeatures.length + idx,
              category: 'screens',
              kind: 'screen',
            }
          })
        return [...baseGoogleFeatures, ...customGoogleFeatures]
      }

      return baseGoogleFeatures
    }

    if (isUser && isAutowebsion) {
      const countData = automationCountQuery.data || []
      const hasWebsiteFromCount = countData.some(
        (c) => c.serviceCategory?.toUpperCase() === 'WEBSITE' && c.total > 0,
      )
      const hasAutomationFromCount = countData.some(
        (c) => c.serviceCategory?.toUpperCase() === 'AUTOMATION' && c.total > 0,
      )

      const isExplicitWebsite = effectiveDeptType?.toUpperCase().includes('WEBSITE')
      const isExplicitAutomation = effectiveDeptType?.toUpperCase().includes('AUTOMATION')

      const showWebsite =
        hasWebsiteFromCount ||
        isExplicitWebsite ||
        (!hasAutomationFromCount && !isExplicitAutomation)

      const showAutomation =
        hasAutomationFromCount ||
        isExplicitAutomation ||
        (!hasWebsiteFromCount && !isExplicitWebsite)

      const autowebsionScreens: Array<{
        key: string
        label: string
        icon: IconName
        slug: string
        screen: HeadScreenKey
      }> = [
        { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
        { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
      ]

      if (showWebsite) {
        autowebsionScreens.push({
          key: 'website-customers',
          label: 'Website Customers',
          icon: 'globe',
          slug: 'website-customers',
          screen: 'website-customers',
        })
      }

      if (showAutomation) {
        autowebsionScreens.push({
          key: 'automation-customers',
          label: 'Automation Customers',
          icon: 'bot',
          slug: 'automation-customers',
          screen: 'automation-customers',
        })
      }

      autowebsionScreens.push(
        { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
        { key: 'help-center', label: 'Help and Support Tickets', icon: 'help', slug: 'help-center', screen: 'help-center' },
      )

      return autowebsionScreens
        .filter((item) => routePerms.isRouteEnabled(item.slug))
        .map((item, index) => ({
          id: `autoweb-user-${item.slug}`,
          departmentId,
          name: item.label,
          description: item.label,
          enabled: true,
          userVisible: true,
          roleAPermission: 'CAN_EDIT',
          roleBPermission: 'CAN_READ',
          screen: item.screen,
          slug: item.slug,
          icon: item.icon,
          order: index,
          category: 'screens',
          kind: 'screen',
        }))
    }

    if (isUser) {
      const baseUserFeatures: FeaturePermission[] = DEPARTMENT_USER_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            (!isOnboarding ||
              routePerms.isRouteEnabled(buildOnboardingRoute(item.slug, role))),
        )
        .map((item, index) => {
          const existing = (query.data ?? []).find(
            (f) => f.slug === item.slug || f.screen === item.screen,
          )
          return {
            id: existing?.id ?? `user-feat-${item.slug}`,
            departmentId,
            name: item.label,
            description: existing?.description ?? item.label,
            enabled: true,
            userVisible: true,
            roleAPermission: existing?.roleAPermission ?? 'CAN_EDIT',
            roleBPermission: existing?.roleBPermission ?? 'CAN_READ',
            screen: item.screen,
            slug: item.slug,
            icon: item.icon,
            order: index,
            category: 'screens',
            kind: 'screen',
          }
        })

      const userCandidateScreens = isOnboarding ? ONBOARDING_USER_SCREENS : DYNAMIC_DEPARTMENT_HEAD_SCREENS
      if (routePerms.routes.length > 0) {
        const customUserFeatures: FeaturePermission[] = routePerms.routes
          .filter(
            (r) =>
              r.routeName &&
              routePerms.isRouteEnabled(r.routeName) &&
              !baseUserFeatures.some((f) => isRouteMatch(r, f.slug)),
          )
          .map((r, idx) => {
            const cleanSlug = extractCleanSlug(r.routeName)
            const matchedStd = DYNAMIC_DEPARTMENT_HEAD_SCREENS.find(
              (s) => s.slug === cleanSlug || isRouteMatch(r, s.slug),
            )
            return {
              id: `custom-route-${r.routeId || cleanSlug}`,
              departmentId,
              name: matchedStd?.label ?? formatRouteLabel(r.routeName),
              description: `Dynamic route (${r.routeName})`,
              enabled: true,
              userVisible: true,
              roleAPermission: 'CAN_EDIT',
              roleBPermission: 'CAN_READ',
              screen: matchedStd?.screen ?? 'custom',
              slug: matchedStd?.slug ?? cleanSlug,
              icon: matchedStd?.icon ?? 'brief',
              order: baseUserFeatures.length + idx,
              category: 'screens',
              kind: 'screen',
            }
          })
        return [...baseUserFeatures, ...customUserFeatures]
      }

      return baseUserFeatures
    }

    // Non-Onboarding & Non-Google Dynamic Department Head:
    if (!isOnboarding) {
      const hasConfiguredRoutes = routePerms.routes.length > 0
      const stdFeatures: FeaturePermission[] = DYNAMIC_DEPARTMENT_HEAD_SCREENS
        .filter((item) => {
          if (!routePerms.isRouteEnabled(item.slug)) return false
          if (!hasConfiguredRoutes) {
            // Default environment when no DB routes exist yet
            return item.slug !== 'meeting' && item.slug !== 'sop'
          }
          // Strictly show only routes configured in DB for this department
          return routePerms.routes.some((r) => isRouteMatch(r, item.slug))
        })
        .map((item, index) => ({
          id: `dyn-feat-${item.slug}`,
          departmentId,
          name: item.label,
          description: item.label,
          enabled: true,
          userVisible: true,
          roleAPermission: 'CAN_EDIT',
          roleBPermission: 'CAN_READ',
          screen: item.screen,
          slug: item.slug,
          icon: item.icon,
          order: index,
          category: 'screens',
          kind: 'screen',
        }))

      const customFeatures: FeaturePermission[] = routePerms.routes
        .filter(
          (r) =>
            r.routeName &&
            routePerms.isRouteEnabled(r.routeName) &&
            !stdFeatures.some((f) => isRouteMatch(r, f.slug)),
        )
        .map((r, idx) => {
          const cleanSlug = extractCleanSlug(r.routeName)
          const matchedStd = DYNAMIC_DEPARTMENT_HEAD_SCREENS.find(
            (s) => s.slug === cleanSlug || isRouteMatch(r, s.slug),
          )
          return {
            id: `custom-route-${r.routeId || cleanSlug}`,
            departmentId,
            name: matchedStd?.label ?? formatRouteLabel(r.routeName),
            description: `Dynamic route (${r.routeName})`,
            enabled: true,
            userVisible: true,
            roleAPermission: 'CAN_EDIT',
            roleBPermission: 'CAN_READ',
            screen: matchedStd?.screen ?? 'custom',
            slug: matchedStd?.slug ?? cleanSlug,
            icon: matchedStd?.icon ?? 'brief',
            order: stdFeatures.length + idx,
            category: 'screens',
            kind: 'screen',
          }
        })

      return [...stdFeatures, ...customFeatures]
    }

    // Onboarding Department: standard onboarding screens + all enabled dynamic routes
    const stdScreens = isUser ? ONBOARDING_USER_SCREENS : ONBOARDING_HEAD_SCREENS
    const stdFeatures: FeaturePermission[] = stdScreens
      .filter(
        (item) =>
          routePerms.isRouteEnabled(item.slug) &&
          routePerms.isRouteEnabled(buildOnboardingRoute(item.slug, role)) &&
          item.slug !== 'fetch-rc',
      )
      .map((item, index) => ({
        id: `onboarding-feat-${item.slug}`,
        departmentId,
        name: item.label,
        description: item.label,
        enabled: true,
        userVisible: true,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        screen: item.screen,
        slug: item.slug,
        icon: item.icon,
        order: index,
        category: 'screens',
        kind: 'screen',
      }))

    const customFeatures: FeaturePermission[] = routePerms.routes
      .filter(
        (r) =>
          r.routeName &&
          routePerms.isRouteEnabled(r.routeName) &&
          !stdFeatures.some((f) => isRouteMatch(r, f.slug)),
      )
      .map((r, idx) => {
        const cleanSlug = extractCleanSlug(r.routeName)
        const matchedStd = ONBOARDING_HEAD_SCREENS.find(
          (s) => s.slug === cleanSlug || isRouteMatch(r, s.slug),
        )
        const screenKey = (matchedStd?.screen ?? (cleanSlug in SCREEN_REGISTRY ? cleanSlug : 'custom')) as HeadScreenKey
        return {
          id: `custom-route-${r.routeId || cleanSlug}`,
          departmentId,
          name: matchedStd?.label ?? formatRouteLabel(r.routeName),
          description: `Dynamic route (${r.routeName})`,
          enabled: true,
          userVisible: true,
          roleAPermission: 'CAN_EDIT',
          roleBPermission: 'CAN_READ',
          screen: screenKey,
          slug: cleanSlug,
          icon: matchedStd?.icon ?? 'brief',
          order: stdFeatures.length + idx,
          category: 'screens',
          kind: 'screen',
        }
      })

    return [...stdFeatures, ...customFeatures]
  }, [isGoogle, isUser, isOnboarding, isAutowebsion, automationCountQuery.data, effectiveDeptType, query.data, departmentId, role, routePerms])

  const items = useMemo<HeadNavItem[]>(() => {
    if (isGoogle) {
      return features
        .filter((feature) => feature.slug !== 'fetch-rc')
        .map((feature) => ({
          key: feature.slug,
          label: feature.name,
          icon: feature.icon,
          to: buildGoogleRoute(feature.slug, role),
        }))
    }

    if (isUser && isAutowebsion) {
      return features.map((feature) => ({
        key: feature.slug,
        label: feature.name,
        icon: feature.icon,
        to: buildDepartmentRoute(feature.slug, effectiveDeptType, role),
      }))
    }

    if (isOnboarding) {
      return features
        .filter((feature) => feature.slug !== 'fetch-rc')
        .map((feature) => ({
          key: feature.slug,
          label: feature.name,
          icon: feature.icon,
          to: buildOnboardingRoute(feature.slug, role),
        }))
    }

    return features
      .filter((feature) => feature.slug !== 'fetch-rc')
      .map((feature) => ({
        key: feature.slug,
        label: feature.name,
        icon: feature.icon,
        to: isOnboarding
          ? buildOnboardingRoute(feature.slug, role)
          : buildDepartmentRoute(feature.slug, effectiveDeptType, role),
      }))
  }, [isGoogle, isUser, isAutowebsion, features, basePath, isOnboarding, role, routePerms, effectiveDeptType])

  const PROFILE_MENU_SCREENS: Record<
    string,
    { name: string; description: string; screen: HeadScreenKey; icon: IconName }
  > = {
    'airtel-calls': {
      name: 'My Airtel Calls',
      description: 'Call history and analytics',
      screen: 'airtel-calls',
      icon: 'phone',
    },
    'manage-services': {
      name: 'Manage Services',
      description: 'Manage department service offerings and plans',
      screen: 'manage-services',
      icon: 'settings',
    },
    'salary-management': {
      name: 'Salary Management',
      description: 'Manage employee salaries, targets, and incentives',
      screen: 'salary-management',
      icon: 'trend',
    },
  }

  const bySlug = (slug: string): FeaturePermission | undefined => {
    const isCustomerSlug =
      slug === 'customer-list' ||
      slug === 'customers' ||
      slug === 'all-customers' ||
      slug === 'autowebision-customers' ||
      slug === 'website-customers' ||
      slug === 'automation-customers' ||
      slug === 'website' ||
      slug === 'automation'
    const s = isCustomerSlug ? 'customers' : slug

    if (PROFILE_MENU_SCREENS[s]) {
      const meta = PROFILE_MENU_SCREENS[s]
      return {
        id: `feature-${s}`,
        departmentId,
        name: meta.name,
        description: meta.description,
        screen: meta.screen,
        slug: s,
        icon: meta.icon,
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    if (
      slug === 'website-customers' ||
      slug === 'website' ||
      slug === 'automation-customers' ||
      slug === 'automation'
    ) {
      const isWeb = slug === 'website-customers' || slug === 'website'
      return {
        id: `feature-${slug}`,
        departmentId,
        name: isWeb ? 'Website Customers' : 'Automation Customers',
        description: isWeb ? 'Website Customers' : 'Automation Customers',
        screen: isWeb ? 'website-customers' : 'automation-customers',
        slug,
        icon: isWeb ? 'globe' : 'bot',
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    if (!isGoogle && !isAutowebsion && !routePerms.isRouteEnabled(s)) {
      return undefined
    }
    const found = features.find(
      (feature) =>
        feature.slug === s ||
        feature.screen === s ||
        (isCustomerSlug &&
          (feature.slug === 'customer-list' ||
            feature.slug === 'customers' ||
            feature.slug === 'all-customers' ||
            feature.slug === 'website-customers' ||
            feature.slug === 'automation-customers' ||
            feature.screen === 'customer-list' ||
            feature.screen === 'customers' ||
            (feature.screen as string) === 'autowebision-customers' ||
            (feature.screen as string) === 'website-customers' ||
            (feature.screen as string) === 'automation-customers')) ||
        (s === 'department-user' && (feature.slug === 'users' || feature.slug === 'department-user')) ||
        (s === 'users' && (feature.slug === 'department-user' || feature.slug === 'users')) ||
        (s === 'member-performance' && (feature.slug === 'member-flow' || feature.slug === 'member-performance')) ||
        (s === 'member-flow' && (feature.slug === 'member-performance' || feature.slug === 'member-flow')),
    )
    if (found) return found

    if (routePerms.routes.length > 0) {
      const matchedDbRoute = routePerms.routes.find(
        (r) => extractCleanSlug(r.routeName) === s || isRouteMatch(r, s),
      )
      if (!matchedDbRoute) {
        return undefined
      }
      const candidateScreens = isOnboarding
        ? (isUser ? ONBOARDING_USER_SCREENS : ONBOARDING_HEAD_SCREENS)
        : DYNAMIC_DEPARTMENT_HEAD_SCREENS
      const matchedStd = candidateScreens.find(
        (item) => item.slug === s || item.screen === s || isRouteMatch(matchedDbRoute, item.slug),
      )
      return {
        id: `dyn-feat-${s}`,
        departmentId,
        name: matchedStd?.label ?? formatRouteLabel(matchedDbRoute.routeName || s),
        description: matchedStd?.label ?? `Dynamic route (${matchedDbRoute.routeName})`,
        screen: matchedStd?.screen ?? 'custom',
        slug: matchedStd?.slug ?? s,
        icon: matchedStd?.icon ?? 'brief',
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    const dynamicFallback = DYNAMIC_DEPARTMENT_HEAD_SCREENS.find(
      (item) => item.slug === s || item.screen === s,
    )
    if (dynamicFallback) {
      return {
        id: `dyn-feat-${dynamicFallback.slug}`,
        departmentId,
        name: dynamicFallback.label,
        description: dynamicFallback.label,
        screen: dynamicFallback.screen,
        slug: dynamicFallback.slug,
        icon: dynamicFallback.icon,
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    const matchedCustomRoute = routePerms.routes.find(
      (r) => extractCleanSlug(r.routeName) === s || isRouteMatch(r, s),
    )
    if (matchedCustomRoute) {
      return {
        id: `custom-route-${matchedCustomRoute.routeId || s}`,
        departmentId,
        name: formatRouteLabel(matchedCustomRoute.routeName || s),
        description: `Dynamic route (${matchedCustomRoute.routeName})`,
        screen: 'custom',
        slug: s,
        icon: 'brief',
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    if (s === 'history') {
      return {
        id: 'feature-history',
        departmentId,
        name: 'History',
        description: 'Task history & analytics',
        screen: 'history',
        slug: 'history',
        icon: 'history',
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    return undefined
  }

  const isRouteEnabled = (slugOrPath: string): boolean => {
    if (
      slugOrPath === 'airtel-calls' ||
      slugOrPath === 'manage-services' ||
      slugOrPath === 'salary-management' ||
      slugOrPath === 'website-customers' ||
      slugOrPath === 'automation-customers' ||
      slugOrPath === 'website' ||
      slugOrPath === 'automation'
    ) {
      return true
    }
    return routePerms.isRouteEnabled(slugOrPath)
  }

  return {
    ...query,
    features,
    items,
    bySlug,
    isRouteEnabled,
    routesQuery: routePerms,
  }
}
