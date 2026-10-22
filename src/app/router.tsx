/* eslint-disable react-refresh/only-export-components -- route configuration intentionally owns lazy component bindings */
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { lazy } from 'react'
import {
  requireAuth,
  requireRole,
  requireRoleDashboard,
  redirectAuthenticatedUser,
} from './middleware/auth.middleware'
import { getSession } from './auth/session'
import { AdminLayout } from '../components/layout/AdminLayout'
import { PageLayout } from '../components/layout/PageLayout'
import { DepartmentManagementPage } from '../features/departments/pages/DepartmentManagementPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { HeadConsoleLayout } from '../features/departments/head/pages/HeadConsoleLayout'
import { AvailableSoonPage } from '../features/departments/head/pages/AvailableSoonPage'

// Route screens are deliberately split from the startup bundle. Several of the
// head/customer screens include large tables, charts and modal workflows; eager
// imports made Chrome parse and evaluate all of them before the small admin
// landing page could respond to input.
const ServicesListPage = lazy(() =>
  import('../features/departments/pages/ServicesListPage').then((module) => ({ default: module.ServicesListPage })),
)
const AdminTimelinesPage = lazy(() =>
  import('../features/departments/pages/AdminTimelinesPage').then((module) => ({ default: module.AdminTimelinesPage })),
)
const AdminApprovalsPage = lazy(() =>
  import('../features/departments/pages/AdminApprovalsPage').then((module) => ({ default: module.AdminApprovalsPage })),
)
const AdminAirtelServicePage = lazy(() =>
  import('../features/departments/pages/AdminAirtelServicePage').then((module) => ({ default: module.AdminAirtelServicePage })),
)
const CreateDepartmentPage = lazy(() =>
  import('../features/departments/pages/CreateDepartmentPage').then((module) => ({ default: module.CreateDepartmentPage })),
)
const DepartmentDashboardPage = lazy(() =>
  import('../features/departments/pages/DepartmentDashboardPage').then((module) => ({ default: module.DepartmentDashboardPage })),
)
const DepartmentCustomersPage = lazy(() =>
  import('../features/departments/pages/DepartmentCustomersPage').then((module) => ({ default: module.DepartmentCustomersPage })),
)
const DepartmentHelpCenterPage = lazy(() =>
  import('../features/departments/pages/DepartmentHelpCenterPage').then((module) => ({ default: module.DepartmentHelpCenterPage })),
)
const DepartmentServicesPage = lazy(() =>
  import('../features/departments/pages/DepartmentServicesPage').then((module) => ({ default: module.DepartmentServicesPage })),
)
const FeaturePermissionsPage = lazy(() =>
  import('../features/permissions/pages/FeaturePermissionsPage').then((module) => ({ default: module.FeaturePermissionsPage })),
)
const FinanceFeaturesPage = lazy(() =>
  import('../features/departments/pages/FinanceFeaturesPage').then((module) => ({ default: module.FinanceFeaturesPage })),
)
const FetchRoutesColumnsPage = lazy(() =>
  import('../features/permissions/pages/FetchRoutesColumnsPage').then((module) => ({ default: module.FetchRoutesColumnsPage })),
)
const ForbiddenPage = lazy(() =>
  import('../features/auth/pages/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })),
)
const HeadIndexPage = lazy(() =>
  import('../features/departments/head/pages/HeadIndexPage').then((module) => ({ default: module.HeadIndexPage })),
)
const HeadScreenPage = lazy(() =>
  import('../features/departments/head/pages/HeadScreenPage').then((module) => ({ default: module.HeadScreenPage })),
)
const CustomerLoginPage = lazy(() =>
  import('../features/customers/pages/CustomerLoginPage').then((module) => ({ default: module.CustomerLoginPage })),
)
const RegisterBusinessPage = lazy(() =>
  import('../features/customers/pages/RegisterBusinessPage').then((module) => ({ default: module.RegisterBusinessPage })),
)
const CustomerDashboardPage = lazy(() =>
  import('../features/customers/pages/CustomerDashboardPage').then((module) => ({ default: module.CustomerDashboardPage })),
)
const CustomerDetailsPage = lazy(() =>
  import('../components/customers-dashboard/CustomerDetailsPage').then((module) => ({ default: module.CustomerDetailsPage })),
)
const CustomerServicesPage = lazy(() =>
  import('../features/customers/pages/CustomerServicesPage').then((module) => ({ default: module.CustomerServicesPage })),
)
const CustomerBillingPage = lazy(() =>
  import('../features/customers/pages/CustomerBillingPage').then((module) => ({ default: module.CustomerBillingPage })),
)
const CustomerAppsPage = lazy(() =>
  import('../features/customers/pages/CustomerAppsPage').then((module) => ({ default: module.CustomerAppsPage })),
)
const CustomerAiServicePage = lazy(() =>
  import('../features/customers/pages/CustomerAiServicePage').then((module) => ({ default: module.CustomerAiServicePage })),
)
const CustomerGenerateOfferPage = lazy(() =>
  import('../features/customers/pages/CustomerGenerateOfferPage').then((module) => ({ default: module.CustomerGenerateOfferPage })),
)
const CustomerMetaAdsScriptPage = lazy(() =>
  import('../features/customers/pages/CustomerMetaAdsScriptPage').then((module) => ({ default: module.CustomerMetaAdsScriptPage })),
)
const CustomerHelpSupportPage = lazy(() =>
  import('../features/customers/pages/CustomerHelpSupportPage').then((module) => ({ default: module.CustomerHelpSupportPage })),
)
const AdminCustomersPage = lazy(() =>
  import('../features/customers/pages/AdminCustomersPage').then((module) => ({ default: module.AdminCustomersPage })),
)
const ProfileUpdatePage = lazy(() =>
  import('../features/profile/pages/ProfileUpdatePage').then((module) => ({ default: module.ProfileUpdatePage })),
)
const OnboardingConfirmationPage = lazy(() =>
  import('../features/customers/pages/OnboardingConfirmationPage').then((module) => ({ default: module.OnboardingConfirmationPage })),
)

function NotFoundPage() {
  const session = getSession()

  if (session?.user.role === 'ADMIN') {
    return (
      <AdminLayout>
        <AvailableSoonPage />
      </AdminLayout>
    )
  }

  if (session?.user.role === 'HEAD' || session?.user.role === 'USER') {
    return (
      <HeadConsoleLayout portalRole={session.user.role}>
        <AvailableSoonPage />
      </HeadConsoleLayout>
    )
  }

  return (
    <PageLayout>
      <AvailableSoonPage />
    </PageLayout>
  )
}

function ProfileUpdateWithShell() {
  const session = getSession()

  if (session?.user.role === 'ADMIN') {
    return (
      <AdminLayout>
        <ProfileUpdatePage />
      </AdminLayout>
    )
  }

  if (session?.user.role === 'HEAD' || session?.user.role === 'USER') {
    return (
      <HeadConsoleLayout portalRole={session.user.role}>
        <ProfileUpdatePage />
      </HeadConsoleLayout>
    )
  }

  return <ProfileUpdatePage />
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RegisterBusinessPage,
})

const registerBusinessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register-business',
  component: RegisterBusinessPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: redirectAuthenticatedUser,
})

const onboardingConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirmation/onboarding',
  component: OnboardingConfirmationPage,
})

const departmentConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirmation/department',
  component: OnboardingConfirmationPage,
})

const authedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authed',
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
})

const adminRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin',
  component: DepartmentManagementPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminCreateDepartmentRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/create-department',
  component: CreateDepartmentPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminCreateDepartmentNestedRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/departments/create',
  component: CreateDepartmentPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminServicesRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/services',
  component: ServicesListPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminTimelinesRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/timelines',
  component: AdminTimelinesPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminServiceFlowRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/service-flow',
  component: AdminTimelinesPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminAirtelServiceRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/airtel-service',
  component: AdminAirtelServicePage,
  beforeLoad: requireRole('ADMIN'),
})

const airtelServiceAliasRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/airtel-service',
  component: AdminAirtelServicePage,
  beforeLoad: requireRole('ADMIN'),
})

const adminApprovalsRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/approvals',
  component: AdminApprovalsPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminCustomersRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/customers',
  component: AdminCustomersPage,
  beforeLoad: requireRole('ADMIN'),
})

const servicesAliasRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/services',
  component: ServicesListPage,
  beforeLoad: requireRole('ADMIN'),
})

const departmentFeaturesRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/departments/$departmentId',
  component: FeaturePermissionsPage,
  beforeLoad: requireRole('ADMIN'),
})

const departmentFinanceRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/departments/$departmentId/finance',
  component: FinanceFeaturesPage,
  beforeLoad: requireRole('ADMIN'),
})

const fetchRcRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/fetch-rc',
  component: FetchRoutesColumnsPage,
  beforeLoad: requireRole('ADMIN', 'HEAD'),
})

const headLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_head',
  component: () => <HeadConsoleLayout portalRole="HEAD" />,
  beforeLoad: requireRoleDashboard('ADMIN', 'HEAD'),
})

const headIndexRoute = createRoute({
  getParentRoute: () => headLayoutRoute,
  path: '/head',
  component: HeadIndexPage,
})

/** Dynamic: slug comes from admin-managed feature permissions. */
const headScreenRoute = createRoute({
  getParentRoute: () => headLayoutRoute,
  path: '/head/$screen',
  component: HeadScreenPage,
})

const userLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_user',
  component: () => <HeadConsoleLayout portalRole="USER" />,
  beforeLoad: requireRoleDashboard('USER'),
})

const usersRoute = createRoute({
  getParentRoute: () => userLayoutRoute,
  path: '/users',
  component: () => <HeadIndexPage portalRole="USER" />,
})

const userScreenRoute = createRoute({
  getParentRoute: () => userLayoutRoute,
  path: '/users/$screen',
  component: HeadScreenPage,
})

const customerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_customers',
  component: () => (
    <div className="cust-layout">
      <Outlet />
    </div>
  ),
})

const customerLoginRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/login',
  component: CustomerLoginPage,
})

const customerDashboardRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers',
  component: CustomerDashboardPage,
})

const customerDetailsRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/details',
  component: CustomerDetailsPage,
})

const customerServicesRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/services',
  component: CustomerServicesPage,
})

const customerBillingRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/billing',
  component: CustomerBillingPage,
})

const customerAppsRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/apps',
  component: CustomerAppsPage,
})

const customerAiServiceRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/ai-service',
  component: CustomerAiServicePage,
})

const customerGenerateOfferRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/ai-service/generate-offer',
  component: CustomerGenerateOfferPage,
})

const customerMetaAdsScriptRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/ai-service/meta-ads-script',
  component: CustomerMetaAdsScriptPage,
})

const customerHelpSupportRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/customers/help-support',
  component: CustomerHelpSupportPage,
})

const directCustomerDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer-details',
  component: CustomerDetailsPage,
})

const directCustomerServicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer-services',
  component: CustomerServicesPage,
})

const directCustomerBillingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer-billing',
  component: CustomerBillingPage,
})

const directCustomerAppsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customer-apps',
  component: CustomerAppsPage,
})

const directAiServiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-service',
  component: CustomerAiServicePage,
})

const directGenerateOfferRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-service/generate-offer',
  component: CustomerGenerateOfferPage,
})

const directMetaAdsScriptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-service/meta-ads-script',
  component: CustomerMetaAdsScriptPage,
})

const directHelpSupportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/help-support',
  component: CustomerHelpSupportPage,
})

const profileUpdateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile-update',
  component: ProfileUpdateWithShell,
  beforeLoad: requireAuth,
})

const forbiddenRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/forbidden',
  component: ForbiddenPage,
})

const departmentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments/$departmentId/dashboard',
  component: DepartmentDashboardPage,
})

const departmentCustomersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments/$departmentId/customers',
  component: DepartmentCustomersPage,
})

const departmentHelpCenterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments/$departmentId/help-center',
  component: DepartmentHelpCenterPage,
})

const departmentServicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/departments/$departmentId/services',
  component: DepartmentServicesPage,
})

const onboardingLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_onboarding',
  component: () => {
    const session = getSession()
    const portalRole = session?.user.role === 'USER' ? 'USER' : 'HEAD'
    return <HeadConsoleLayout portalRole={portalRole} />
  },
  beforeLoad: requireRoleDashboard('ADMIN', 'HEAD', 'USER'),
})

const onboardingIndexRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding',
  component: () => {
    const session = getSession()
    const portalRole = session?.user.role === 'USER' ? 'USER' : 'HEAD'
    return <HeadIndexPage portalRole={portalRole} />
  },
})

const onboardingHeadDashboardRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const onboardingUserRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-user',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const onboardingUserDashboardRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const onboardingHeadCustomersRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-customers',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const onboardingUserCustomersRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-customers',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const onboardingHeadCustomerListRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-customer-list',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const onboardingUserCustomerListRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-customer-list',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const onboardingHeadUsersRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-users',
  component: () => <HeadScreenPage screenOverride="users" />,
})

const onboardingUserUsersRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-users',
  component: () => <HeadScreenPage screenOverride="users" />,
})

const onboardingHeadMeetingRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-meeting',
  component: () => <HeadScreenPage screenOverride="meeting" />,
})

const onboardingUserMeetingRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-meeting',
  component: () => <HeadScreenPage screenOverride="meeting" />,
})

const onboardingHeadSopRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-sop',
  component: () => <HeadScreenPage screenOverride="sop" />,
})

const onboardingUserSopRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-sop',
  component: () => <HeadScreenPage screenOverride="sop" />,
})

const onboardingHeadAttendanceRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-attendance',
  component: () => <HeadScreenPage screenOverride="attendance" />,
})

const onboardingUserAttendanceRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-attendance',
  component: () => <HeadScreenPage screenOverride="attendance" />,
})

const onboardingHeadHelpCenterRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-help-center',
  component: () => <HeadScreenPage screenOverride="help-center" />,
})

const onboardingUserHelpCenterRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-help-center',
  component: () => <HeadScreenPage screenOverride="help-center" />,
})

const onboardingHeadHistoryRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-history',
  component: () => <HeadScreenPage screenOverride="history" />,
})

const onboardingUserHistoryRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-history',
  component: () => <HeadScreenPage screenOverride="history" />,
})


const onboardingHeadAirtelCallsRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-airtel-calls',
  component: () => <HeadScreenPage screenOverride="airtel-calls" />,
})

const onboardingUserAirtelCallsRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-airtel-calls',
  component: () => <HeadScreenPage screenOverride="airtel-calls" />,
})

const onboardingHeadManageServicesRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-manage-services',
  component: () => <HeadScreenPage screenOverride="manage-services" />,
})

const onboardingUserManageServicesRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-manage-services',
  component: () => <HeadScreenPage screenOverride="manage-services" />,
})

const onboardingHeadSalaryManagementRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-salary-management',
  component: () => <HeadScreenPage screenOverride="salary-management" />,
})

const onboardingUserSalaryManagementRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding-dashboard-head-departmentUser-salary-management',
  component: () => <HeadScreenPage screenOverride="salary-management" />,
})

const onboardingDynamicScreenRoute = createRoute({
  getParentRoute: () => onboardingLayoutRoute,
  path: '/onboarding/$screen',
  component: HeadScreenPage,
})

const googleLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_google',
  component: () => <HeadConsoleLayout portalRole="HEAD" />,
  beforeLoad: requireRoleDashboard('ADMIN', 'HEAD', 'USER'),
})

const googleHeadIndexRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const googleHeadDashboardRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/dashboard',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const googleHeadUsersRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/users',
  component: () => <HeadScreenPage screenOverride="users" />,
})

const googleHeadCustomersRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/customers',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const googleHeadCustomerListRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/customer-list',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const googleHeadHistoryRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/history',
  component: () => <HeadScreenPage screenOverride="history" />,
})

const googleHeadAnalyticsRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/analytics',
  component: () => <HeadScreenPage screenOverride="analytics" />,
})

const googleHeadServiceFlowRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/service-flow',
  component: () => <HeadScreenPage screenOverride="service-flow" />,
})

const googleHeadMemberFlowRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/member-flow',
  component: () => <HeadScreenPage screenOverride="member-flow" />,
})

const googleHeadHelpSupportRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/help-support',
  component: () => <HeadScreenPage screenOverride="help-support" />,
})

const googleHeadHelpCenterRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/help-center',
  component: () => <HeadScreenPage screenOverride="help-support" />,
})

const googleHeadDynamicScreenRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/$screen',
  component: HeadScreenPage,
})

const googleUserLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_google_user',
  component: () => <HeadConsoleLayout portalRole="USER" />,
  beforeLoad: requireRoleDashboard('ADMIN', 'HEAD', 'USER'),
})

const googleUserIndexRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const googleUserDashboardRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/dashboard',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const googleUserAttendanceRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/attendance',
  component: () => <HeadScreenPage screenOverride="attendance" />,
})

const googleUserCustomersRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/customers',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const googleUserCustomerListRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/customer-list',
  component: () => <HeadScreenPage screenOverride="customers" />,
})

const googleUserHistoryRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/history',
  component: () => <HeadScreenPage screenOverride="history" />,
})

const googleUserHelpSupportRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/help-support',
  component: () => <HeadScreenPage screenOverride="help-support" />,
})

const googleUserHelpCenterRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/help-center',
  component: () => <HeadScreenPage screenOverride="help-support" />,
})

const googleHeadAirtelCallsRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/airtel-calls',
  component: () => <HeadScreenPage screenOverride="airtel-calls" />,
})

const googleHeadManageServicesRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/manage-services',
  component: () => <HeadScreenPage screenOverride="manage-services" />,
})

const googleHeadSalaryManagementRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/salary-management',
  component: () => <HeadScreenPage screenOverride="salary-management" />,
})

const googleUserAirtelCallsRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/airtel-calls',
  component: () => <HeadScreenPage screenOverride="airtel-calls" />,
})

const googleUserManageServicesRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/manage-services',
  component: () => <HeadScreenPage screenOverride="manage-services" />,
})

const googleUserSalaryManagementRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/salary-management',
  component: () => <HeadScreenPage screenOverride="salary-management" />,
})

const googleUserDynamicScreenRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user/$screen',
  component: HeadScreenPage,
})

/**
 * Dynamic Department Portal Routes:
 * Matches URLs like http://localhost:5173/{department_name}/{routes}
 * e.g., /seo/dashboard, /seo/customers, /seo/users, /sales/dashboard, etc.
 */
const dynamicDepartmentLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_dynamic_dept',
  component: () => {
    const session = getSession()
    const portalRole = session?.user.role === 'USER' ? 'USER' : 'HEAD'
    return <HeadConsoleLayout portalRole={portalRole} />
  },
  beforeLoad: requireRoleDashboard('ADMIN', 'HEAD', 'USER'),
})

const dynamicDepartmentRoleScreenRoute = createRoute({
  getParentRoute: () => dynamicDepartmentLayoutRoute,
  path: '/$departmentName/$role/$screen',
  component: HeadScreenPage,
})

const dynamicDepartmentRoleIndexRoute = createRoute({
  getParentRoute: () => dynamicDepartmentLayoutRoute,
  path: '/$departmentName/$role',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const dynamicDepartmentIndexRoute = createRoute({
  getParentRoute: () => dynamicDepartmentLayoutRoute,
  path: '/$departmentName',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const dynamicDepartmentScreenRoute = createRoute({
  getParentRoute: () => dynamicDepartmentLayoutRoute,
  path: '/$departmentName/$screen',
  component: HeadScreenPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  registerBusinessRoute,
  loginRoute,
  googleLayoutRoute.addChildren([
    googleHeadIndexRoute,
    googleHeadDashboardRoute,
    googleHeadUsersRoute,
    googleHeadCustomersRoute,
    googleHeadCustomerListRoute,
    googleHeadHistoryRoute,
    googleHeadAnalyticsRoute,
    googleHeadServiceFlowRoute,
    googleHeadMemberFlowRoute,
    googleHeadHelpSupportRoute,
    googleHeadHelpCenterRoute,
    googleHeadAirtelCallsRoute,
    googleHeadManageServicesRoute,
    googleHeadSalaryManagementRoute,
    googleHeadDynamicScreenRoute,
  ]),
  googleUserLayoutRoute.addChildren([
    googleUserIndexRoute,
    googleUserDashboardRoute,
    googleUserAttendanceRoute,
    googleUserCustomersRoute,
    googleUserCustomerListRoute,
    googleUserHistoryRoute,
    googleUserHelpSupportRoute,
    googleUserHelpCenterRoute,
    googleUserAirtelCallsRoute,
    googleUserManageServicesRoute,
    googleUserSalaryManagementRoute,
    googleUserDynamicScreenRoute,
  ]),
  onboardingLayoutRoute.addChildren([
    onboardingIndexRoute,
    onboardingUserRoute,
    onboardingHeadDashboardRoute,
    onboardingUserDashboardRoute,
    onboardingHeadCustomersRoute,
    onboardingUserCustomersRoute,
    onboardingHeadCustomerListRoute,
    onboardingUserCustomerListRoute,
    onboardingHeadUsersRoute,
    onboardingUserUsersRoute,
    onboardingHeadMeetingRoute,
    onboardingUserMeetingRoute,
    onboardingHeadSopRoute,
    onboardingUserSopRoute,
    onboardingHeadAttendanceRoute,
    onboardingUserAttendanceRoute,
    onboardingHeadHelpCenterRoute,
    onboardingUserHelpCenterRoute,
    onboardingHeadHistoryRoute,
    onboardingUserHistoryRoute,
    onboardingHeadAirtelCallsRoute,
    onboardingUserAirtelCallsRoute,
    onboardingHeadManageServicesRoute,
    onboardingUserManageServicesRoute,
    onboardingHeadSalaryManagementRoute,
    onboardingUserSalaryManagementRoute,
    onboardingDynamicScreenRoute,
  ]),
  headLayoutRoute.addChildren([
    headIndexRoute,
    headScreenRoute,
  ]),
  userLayoutRoute.addChildren([
    usersRoute,
    userScreenRoute,
  ]),
  authedLayoutRoute.addChildren([
    adminRoute,
    adminCreateDepartmentRoute,
    adminCreateDepartmentNestedRoute,
    adminCustomersRoute,
    adminServicesRoute,
    adminTimelinesRoute,
    adminServiceFlowRoute,
    adminApprovalsRoute,
    adminAirtelServiceRoute,
    airtelServiceAliasRoute,
    servicesAliasRoute,
    departmentFeaturesRoute,
    departmentFinanceRoute,
    fetchRcRoute,
    forbiddenRoute,
  ]),
  customerLayoutRoute.addChildren([
    customerLoginRoute,
    customerDashboardRoute,
    customerDetailsRoute,
    customerServicesRoute,
    customerBillingRoute,
    customerAppsRoute,
    customerAiServiceRoute,
    customerGenerateOfferRoute,
    customerMetaAdsScriptRoute,
    customerHelpSupportRoute,
  ]),
  directCustomerDetailsRoute,
  directCustomerServicesRoute,
  directCustomerBillingRoute,
  directCustomerAppsRoute,
  directAiServiceRoute,
  directGenerateOfferRoute,
  directMetaAdsScriptRoute,
  directHelpSupportRoute,
  onboardingConfirmationRoute,
  departmentConfirmationRoute,
  profileUpdateRoute,
  departmentDashboardRoute,
  departmentCustomersRoute,
  departmentHelpCenterRoute,
  departmentServicesRoute,
  dynamicDepartmentLayoutRoute.addChildren([
    dynamicDepartmentRoleScreenRoute,
    dynamicDepartmentRoleIndexRoute,
    dynamicDepartmentIndexRoute,
    dynamicDepartmentScreenRoute,
  ]),
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}






