/* eslint-disable react-refresh/only-export-components -- route configuration intentionally owns lazy component bindings */
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const HrmEmbed = lazy(() => import('../modules/hrm/HrmEmbed'))
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
import {
  legacyToStandardPath,
  resolvePortalRoleFromPath,
} from '../features/departments/head/utils/routeUtils'
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
const NotificationHistoryPage = lazy(() =>
  import('../features/notifications/pages/NotificationHistoryPage').then((module) => ({ default: module.NotificationHistoryPage })),
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
const SalaryManagementPage = lazy(() =>
  import('../features/departments/head/pages/SalaryManagementPage').then((module) => ({ default: module.SalaryManagementPage })),
)
const ConfigPage = lazy(() =>
  import('../features/config/ConfigPage').then((module) => ({ default: module.ConfigPage })),
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
const SalesProposalPage = lazy(() =>
  import('../features/sales/pages/SalesProposalPage').then((module) => ({ default: module.SalesProposalPage })),
)
const LeadsManagementPage = lazy(() =>
  import('../features/sales/pages/LeadsManagementPage').then((module) => ({ default: module.LeadsManagementPage })),
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

const hrmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hrm/$',
  component: () => (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading HRM...</div>}>
      <HrmEmbed />
    </Suspense>
  ),
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

const salesProposalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales',
  component: SalesProposalPage,
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

const websiteConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirmation/website',
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

const adminSalaryManagementRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/salary-management',
  component: SalaryManagementPage,
  beforeLoad: requireRole('ADMIN'),
})

const salaryManagementAliasRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/salary-management',
  component: SalaryManagementPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminConfigRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/config',
  component: ConfigPage,
  beforeLoad: requireRole('ADMIN'),
})

const configAliasRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/config',
  component: ConfigPage,
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

const adminNotificationHistoryRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/notification-history',
  component: NotificationHistoryPage,
  beforeLoad: requireRole('ADMIN'),
})

const manageLeadsRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/manage-leads',
  component: LeadsManagementPage,
  beforeLoad: requireRole('ADMIN'),
})

const adminLeadsRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/leads',
  component: LeadsManagementPage,
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

/**
 * Department portals — one URL standard for every department
 * (see routeUtils.buildDepartmentRoute):
 *   /{dept}-head[/{screen}]   e.g. /onboarding-head/meeting, /google-head/users
 *   /{dept}-user[/{screen}]   e.g. /onboarding-user/customers, /google-user/history
 * Screens are resolved dynamically from the admin-managed routes, so new
 * routes need no change here. Old URLs (/onboarding-dashboard-head-meeting,
 * /sales/head/leads, ...) redirect to the standard form.
 */
const redirectLegacyPortalPath = ({ location }: { location: { pathname: string } }) => {
  const target = legacyToStandardPath(location.pathname)
  if (target && target !== location.pathname) {
    throw redirect({ to: target as never, replace: true })
  }
}

function portalLayoutRoute(id: string, portalRole: 'HEAD' | 'USER') {
  return createRoute({
    getParentRoute: () => rootRoute,
    id,
    component: () => <HeadConsoleLayout portalRole={portalRole} />,
    beforeLoad: requireRoleDashboard('ADMIN', 'HEAD', 'USER'),
  })
}

const onboardingHeadLayoutRoute = portalLayoutRoute('_onboarding_head', 'HEAD')

const onboardingHeadIndexRoute = createRoute({
  getParentRoute: () => onboardingHeadLayoutRoute,
  path: '/onboarding-head',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const onboardingHeadScreenRoute = createRoute({
  getParentRoute: () => onboardingHeadLayoutRoute,
  path: '/onboarding-head/$screen',
  component: HeadScreenPage,
})

const onboardingUserLayoutRoute = portalLayoutRoute('_onboarding_user', 'USER')

const onboardingUserIndexRoute = createRoute({
  getParentRoute: () => onboardingUserLayoutRoute,
  path: '/onboarding-user',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const onboardingUserScreenRoute = createRoute({
  getParentRoute: () => onboardingUserLayoutRoute,
  path: '/onboarding-user/$screen',
  component: HeadScreenPage,
})

/** Old onboarding URLs: /onboarding and /onboarding/{screen} -> /onboarding-head[/{screen}]. */
const onboardingLegacyIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: redirectLegacyPortalPath,
})

const onboardingLegacyScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding/$screen',
  beforeLoad: redirectLegacyPortalPath,
})

const googleLayoutRoute = portalLayoutRoute('_google', 'HEAD')

const googleHeadIndexRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
})

const googleHeadDynamicScreenRoute = createRoute({
  getParentRoute: () => googleLayoutRoute,
  path: '/google-head/$screen',
  component: HeadScreenPage,
})

const googleUserLayoutRoute = portalLayoutRoute('_google_user', 'USER')

const googleUserIndexRoute = createRoute({
  getParentRoute: () => googleUserLayoutRoute,
  path: '/google-user',
  component: () => <HeadScreenPage screenOverride="dashboard" />,
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
    const portalRole =
      resolvePortalRoleFromPath(window.location.pathname) ??
      (session?.user.role === 'USER' ? 'USER' : 'HEAD')
    return <HeadConsoleLayout portalRole={portalRole} />
  },
  beforeLoad: (ctx) => {
    requireRoleDashboard('ADMIN', 'HEAD', 'USER')()
    redirectLegacyPortalPath(ctx)
  },
})

const dynamicDepartmentRoleScreenRoute = createRoute({
  getParentRoute: () => dynamicDepartmentLayoutRoute,
  path: '/$departmentName/$role/$screen',
  component: HeadScreenPage,
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
  salesProposalRoute,
  loginRoute,
  googleLayoutRoute.addChildren([
    googleHeadIndexRoute,
    googleHeadDynamicScreenRoute,
  ]),
  googleUserLayoutRoute.addChildren([
    googleUserIndexRoute,
    googleUserDynamicScreenRoute,
  ]),
  onboardingHeadLayoutRoute.addChildren([
    onboardingHeadIndexRoute,
    onboardingHeadScreenRoute,
  ]),
  onboardingUserLayoutRoute.addChildren([
    onboardingUserIndexRoute,
    onboardingUserScreenRoute,
  ]),
  onboardingLegacyIndexRoute,
  onboardingLegacyScreenRoute,
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
    adminNotificationHistoryRoute,
    manageLeadsRoute,
    adminLeadsRoute,
    adminServicesRoute,
    adminTimelinesRoute,
    adminServiceFlowRoute,
    adminApprovalsRoute,
    adminAirtelServiceRoute,
    airtelServiceAliasRoute,
    adminSalaryManagementRoute,
    salaryManagementAliasRoute,
    adminConfigRoute,
    configAliasRoute,
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
  websiteConfirmationRoute,
  profileUpdateRoute,
  departmentDashboardRoute,
  departmentCustomersRoute,
  departmentHelpCenterRoute,
  departmentServicesRoute,
  hrmRoute,
  dynamicDepartmentLayoutRoute.addChildren([
    dynamicDepartmentRoleScreenRoute,
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






