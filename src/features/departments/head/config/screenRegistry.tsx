import type { ComponentType } from 'react'
import type {
  FeaturePermission,
  HeadScreenKey,
} from '../../../permissions/types/permission.types'
import { DashboardPage } from '../pages/DashboardPage'
import { DepartmentUsersPage } from '../pages/DepartmentUsersPage'
import { CustomerOnboardingPage } from '../pages/CustomerOnboardingPage'
import { MeetingPage } from '../pages/MeetingPage'
import { SopPage } from '../pages/SopPage'
import { HelpCenterPage } from '../pages/HelpCenterPage'
import { CustomFeaturePage } from '../pages/CustomFeaturePage'

interface ScreenEntry {
  component: ComponentType<{ feature: FeaturePermission }>
  /** Title shown in the topbar; falls back to feature name. */
  title?: string
}

/**
 * screen key → page component. Admin picks the key
 * when creating a feature; the sidebar label, slug
 * and icon come from the feature itself.
 */
export const SCREEN_REGISTRY: Record<HeadScreenKey, ScreenEntry> = {
  dashboard: { component: DashboardPage, title: 'Onboarding Dashboard' },
  users: { component: DepartmentUsersPage, title: 'Department Management' },
  customers: { component: CustomerOnboardingPage, title: 'Customer Onboarding' },
  meeting: { component: MeetingPage, title: '15 Days Meeting' },
  sop: { component: SopPage, title: 'SOP' },
  'help-center': { component: HelpCenterPage, title: 'Help Center' },
  custom: { component: CustomFeaturePage },
}
