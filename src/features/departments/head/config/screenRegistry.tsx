import { lazy, type ComponentType } from 'react'
import type {
  FeaturePermission,
  HeadScreenKey,
} from '../../../permissions/types/permission.types'

function lazyScreen<T extends Record<string, ComponentType<{ feature: FeaturePermission }>>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) {
  return lazy(async () => {
    const module = await loader()
    return { default: module[exportName] }
  })
}

const DashboardPage = lazyScreen(() => import('../pages/DashboardPage'), 'DashboardPage')
const DepartmentUsersPage = lazyScreen(() => import('../pages/DepartmentUsersPage'), 'DepartmentUsersPage')
const CustomerListPage = lazyScreen(() => import('../pages/CustomerListPage'), 'CustomerListPage')
const AttendancePage = lazyScreen(() => import('../pages/AttendancePage'), 'AttendancePage')
const MeetingPage = lazyScreen(() => import('../pages/MeetingPage'), 'MeetingPage')
const SopPage = lazyScreen(() => import('../pages/SopPage'), 'SopPage')
const HelpCenterPage = lazyScreen(() => import('../pages/HelpCenterPage'), 'HelpCenterPage')
const HistoryPage = lazyScreen(() => import('../pages/HistoryPage'), 'HistoryPage')
const AnalyticsPage = lazyScreen(() => import('../pages/AnalyticsPage'), 'AnalyticsPage')
const ServiceFlowPage = lazyScreen(() => import('../pages/ServiceFlowPage'), 'ServiceFlowPage')
const MemberFlowPage = lazyScreen(() => import('../pages/MemberFlowPage'), 'MemberFlowPage')
const CustomFeaturePage = lazyScreen(() => import('../pages/CustomFeaturePage'), 'CustomFeaturePage')
const MyAirtelCallsPage = lazyScreen(() => import('../pages/MyAirtelCallsPage'), 'MyAirtelCallsPage')
const ManageServicesPage = lazyScreen(() => import('../pages/ManageServicesPage'), 'ManageServicesPage')
const SalaryManagementPage = lazyScreen(() => import('../pages/SalaryManagementPage'), 'SalaryManagementPage')

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
  'department-user': { component: DepartmentUsersPage, title: 'Department Users' },
  'department-users': { component: DepartmentUsersPage, title: 'Department Users' },
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
  'member-performance': { component: MemberFlowPage as ComponentType<{ feature: FeaturePermission }>, title: 'Member Performance' },
  'help-support': { component: HelpCenterPage, title: 'Help & Support' },
  'airtel-calls': { component: MyAirtelCallsPage as ComponentType<{ feature: FeaturePermission }>, title: 'My Airtel Calls' },
  'manage-services': { component: ManageServicesPage as ComponentType<{ feature: FeaturePermission }>, title: 'Manage Services' },
  'salary-management': { component: SalaryManagementPage as ComponentType<{ feature: FeaturePermission }>, title: 'Salary Management' },
  custom: { component: CustomFeaturePage },
} as Record<string, ScreenEntry>
