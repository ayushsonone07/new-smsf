import type { ComponentType } from 'react'
import type {
  FeaturePermission,
  HeadScreenKey,
} from '../../../permissions/types/permission.types'
import { DashboardPage } from '../pages/DashboardPage'
import { DepartmentUsersPage } from '../pages/DepartmentUsersPage'
import { CustomerListPage } from '../pages/CustomerListPage'
import { AttendancePage } from '../pages/AttendancePage'
import { MeetingPage } from '../pages/MeetingPage'
import { SopPage } from '../pages/SopPage'
import { HelpCenterPage } from '../pages/HelpCenterPage'
import { HistoryPage } from '../pages/HistoryPage'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { ServiceFlowPage } from '../pages/ServiceFlowPage'
import { MemberFlowPage } from '../pages/MemberFlowPage'
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
  dashboard: { component: DashboardPage, title: 'Dashboard' },
  users: { component: DepartmentUsersPage, title: 'Department Management' },
  customers: { component: CustomerListPage, title: 'Customer List' },
  'customer-list': { component: CustomerListPage, title: 'Customer List' },
  attendance: { component: AttendancePage, title: 'Attendance' },
  meeting: { component: MeetingPage, title: '15 Days Meeting' },
  sop: { component: SopPage, title: 'SOP' },
  'help-center': { component: HelpCenterPage, title: 'Help Center' },
  history: { component: HistoryPage as ComponentType<{ feature: FeaturePermission }>, title: 'Task History' },
  analytics: { component: AnalyticsPage as ComponentType<{ feature: FeaturePermission }>, title: 'Analytics' },
  'service-flow': { component: ServiceFlowPage as ComponentType<{ feature: FeaturePermission }>, title: 'Service Flow' },
  'member-flow': { component: MemberFlowPage as ComponentType<{ feature: FeaturePermission }>, title: 'Member Flow' },
  'help-support': { component: HelpCenterPage, title: 'Help & Support' },
  custom: { component: CustomFeaturePage },
} as Record<string, ScreenEntry>
