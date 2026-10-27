import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from '@tanstack/react-router'
import { getSession } from '../../../../app/auth/session'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { SCREEN_REGISTRY } from '../config/screenRegistry'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import {
  buildDepartmentRoute,
  resolveDeptFromPath,
  resolvePortalRoleFromPath,
  resolveSlugFromPath,
} from '../utils/routeUtils'
import { normalizeDepartmentTypeName } from '../../../../api/dynamic-permission.api'
import { AutowebisionCustomersPage } from './AutowebisionCustomersPage'
import { DeliveredCustomersPage } from './DeliveredCustomersPage'

interface HeadScreenPageProps {
  screenOverride?: string
}

/**
 * Resolves the slug from route params, screenOverride, or pathname,
 * and renders that screen's component.
 */
export function HeadScreenPage({ screenOverride }: HeadScreenPageProps = {}) {
  const { screen } = useParams({ strict: false }) as {
    screen?: string
  }
  const location = useLocation()
  const departmentId = useHeadDepartmentId()
  // `/{dept}-head/...` -> dept; the route params are not the department name any more.
  const deptFromUrl = resolveDeptFromPath(location.pathname) || undefined
  const role = resolvePortalRoleFromPath(location.pathname) ?? undefined
  const session = getSession()
  const effectiveDepartmentType = session?.user.departmentType || deptFromUrl
  const nav = useHeadNav(departmentId, effectiveDepartmentType)
  const navigate = useNavigate()
  const didRedirect = useRef(false)

  const ready = !nav.isPending && !nav.isError
  const targetSlug = screenOverride || screen || resolveSlugFromPath(location.pathname)
  const feature = ready && targetSlug ? nav.bySlug(targetSlug) : undefined
  const Screen = feature ? SCREEN_REGISTRY[feature.screen]?.component : undefined

  // Fall back to the first enabled feature when the requested slug is unknown.
  // Redirect imperatively, once, instead of <Navigate> (see HeadIndexPage).
  let target: string | null = null
  if (ready && !feature) {
    const firstEnabledFeature = nav.features[0]
    if (firstEnabledFeature) {
      const isUser = (role?.toUpperCase() === 'USER') || (session?.user.role === 'USER')
      const deptType = session?.user.departmentType || deptFromUrl
      const candidate = buildDepartmentRoute(
        firstEnabledFeature.slug,
        deptType,
        isUser ? 'USER' : 'HEAD',
      )
      if (candidate !== location.pathname) target = candidate
    }
  }

  useEffect(() => {
    if (!target || didRedirect.current) return
    didRedirect.current = true
    navigate({ to: target as never, replace: true })
  }, [navigate, target])

  if (nav.isPending) {
    return <LoadingState message="Loading..." />
  }

  if (nav.isError) {
    return (
      <ErrorState
        title="Unable to load menu"
        message={nav.error?.message}
        onRetry={() => nav.refetch()}
      />
    )
  }

  if (!feature) {
    if (target) return <LoadingState message="Redirecting..." />
    return (
      <ErrorState
        title="No pages enabled"
        message="The admin has not enabled any route for your department yet."
      />
    )
  }

  // The support "delivered" route may already exist as a generic `custom`
  // feature created by the admin, so resolve it by slug as well as by screen.
  const isSupportDepartment = Boolean(
    effectiveDepartmentType &&
      normalizeDepartmentTypeName(effectiveDepartmentType) === 'SUPPORT_DEPARTMENT',
  )
  if (isSupportDepartment && targetSlug === 'delivered') {
    return <DeliveredCustomersPage feature={feature} />
  }

  if (!Screen) {
    return (
      <ErrorState
        title="Page not available"
        message="This page is not available yet."
      />
    )
  }

  const isAutowebsion = Boolean(
    effectiveDepartmentType && (
      normalizeDepartmentTypeName(effectiveDepartmentType) === 'AUTOWEBSION_DEPARTMENT' ||
      normalizeDepartmentTypeName(effectiveDepartmentType) === 'WEBSITE_DEPARTMENT' ||
      normalizeDepartmentTypeName(effectiveDepartmentType) === 'AUTOMATION_DEPARTMENT' ||
      effectiveDepartmentType.toUpperCase().includes('AUTOWEB') ||
      effectiveDepartmentType.toUpperCase().includes('WEBSITE') ||
      effectiveDepartmentType.toUpperCase().includes('AUTOMATION')
    ),
  )

  const isAutowebsionCustomerScreen =
    isAutowebsion &&
    (feature.screen === 'customers' ||
      (feature.screen as string) === 'customer-list' ||
      (feature.screen as string) === 'autowebision-customers' ||
      (feature.screen as string) === 'website-customers' ||
      (feature.screen as string) === 'automation-customers' ||
      targetSlug === 'customers' ||
      targetSlug === 'customer-list' ||
      targetSlug === 'all-customers' ||
      targetSlug === 'autowebision-customers' ||
      targetSlug === 'website-customers' ||
      targetSlug === 'automation-customers' ||
      targetSlug === 'website' ||
      targetSlug === 'automation')

  if (isAutowebsionCustomerScreen) {
    const defaultSubTab =
      targetSlug === 'website-customers' || targetSlug === 'website' || (feature.screen as string) === 'website-customers'
        ? 'WEBSITE'
        : targetSlug === 'automation-customers' || targetSlug === 'automation' || (feature.screen as string) === 'automation-customers'
          ? 'AUTOMATION'
          : 'ALL'

    return <AutowebisionCustomersPage feature={feature} defaultSubTab={defaultSubTab} />
  }

  return <Screen feature={feature} />
}
