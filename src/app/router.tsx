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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
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






