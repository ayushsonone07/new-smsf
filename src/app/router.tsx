import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import {
  requireAuth,
  requireRole,
  requireRoleDashboard,
  redirectAuthenticatedUser,
} from './middleware/auth.middleware'
import {
  clearSession,
  getSession,
  homeForRole,
} from './auth/session'
import { AdminLayout } from '../components/layout/AdminLayout'
import { PageLayout } from '../components/layout/PageLayout'
import { ErrorState } from '../components/ui/ErrorState'
import { DepartmentManagementPage } from '../features/departments/pages/DepartmentManagementPage'
import { DepartmentDashboardPage } from '../features/departments/pages/DepartmentDashboardPage'
import { DepartmentCustomersPage } from '../features/departments/pages/DepartmentCustomersPage'
import { DepartmentHelpCenterPage } from '../features/departments/pages/DepartmentHelpCenterPage'
import { DepartmentServicesPage } from '../features/departments/pages/DepartmentServicesPage'
import { FeaturePermissionsPage } from '../features/permissions/pages/FeaturePermissionsPage'
import { FinanceFeaturesPage } from '../features/departments/pages/FinanceFeaturesPage'
import { AccessTokensPage } from '../features/auth/pages/AccessTokensPage'
import { FetchRoutesColumnsPage } from '../features/permissions/pages/FetchRoutesColumnsPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ForbiddenPage } from '../features/auth/pages/ForbiddenPage'
import { HeadConsoleLayout } from '../features/departments/head/pages/HeadConsoleLayout'
import { HeadIndexPage } from '../features/departments/head/pages/HeadIndexPage'
import { HeadScreenPage } from '../features/departments/head/pages/HeadScreenPage'
import { CustomerLoginPage } from '../features/customers/pages/CustomerLoginPage'
import { CustomerDashboardPage } from '../features/customers/pages/CustomerDashboardPage'
import { CustomerDetailsPage } from '../components/customers-dashboard/CustomerDetailsPage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <PageLayout>
      <ErrorState
        title="Page not found"
        message="The page you are looking for does not exist."
      />
    </PageLayout>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const session = getSession()

    throw redirect({
      to: session
        ? homeForRole(session.user.role as never) as never
        : '/login',
    })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string } => ({
    token:
      typeof search.token === 'string'
        ? search.token
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    const session = getSession()

    if (!session) return

    // A magic link always wins over whoever is signed in
    // right now — otherwise opening the generated link in
    // the admin's own browser silently bounces back to
    // /admin instead of signing the head/user in.
    if (typeof search.token === 'string' && search.token) {
      clearSession()
      return
    }

    redirectAuthenticatedUser()
  },
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

const accessTokensRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/tokens',
  component: AccessTokensPage,
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
  component: () => <HeadScreenPage screenOverride="dashboard" />,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
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
    googleHeadDynamicScreenRoute,
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
    departmentFeaturesRoute,
    departmentFinanceRoute,
    accessTokensRoute,
    fetchRcRoute,
    forbiddenRoute,
  ]),
  customerLayoutRoute.addChildren([
    customerLoginRoute,
    customerDashboardRoute,
    customerDetailsRoute,
  ]),
  departmentDashboardRoute,
  departmentCustomersRoute,
  departmentHelpCenterRoute,
  departmentServicesRoute,
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}






