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
} from './middleware/auth.middleware'
import {
  getSession,
  homeForRole,
} from './auth/session'
import { AdminLayout } from '../components/layout/AdminLayout'
import { DepartmentManagementPage } from '../features/departments/pages/DepartmentManagementPage'
import { FeaturePermissionsPage } from '../features/permissions/pages/FeaturePermissionsPage'
import { AccessTokensPage } from '../features/auth/pages/AccessTokensPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ForbiddenPage } from '../features/auth/pages/ForbiddenPage'

function pendingPage(title: string) {
  return (
    <main className="page-content">
      <div className="loading-state">
        {title} — page coming soon
      </div>
    </main>
  )
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="page-content">
      <div className="error-state">
        <strong>Page not found</strong>

        <p>
          The page you are looking for does not
          exist.
        </p>
      </div>
    </main>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const session = getSession()

    throw redirect({
      to: session
        ? homeForRole(session.user.role)
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
  beforeLoad: () => {
    const session = getSession()

    if (session) {
      throw redirect({
        to: homeForRole(session.user.role),
      })
    }
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

const accessTokensRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/admin/tokens',
  component: AccessTokensPage,
  beforeLoad: requireRole('ADMIN'),
})

const headRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/head',
  component: () => pendingPage('Head Panel'),
  beforeLoad: requireRole('ADMIN', 'HEAD'),
})

const usersRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/users',
  component: () => pendingPage('Users'),
  beforeLoad: requireRole(
    'ADMIN',
    'HEAD',
    'USER',
  ),
})

const forbiddenRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/forbidden',
  component: ForbiddenPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authedLayoutRoute.addChildren([
    adminRoute,
    departmentFeaturesRoute,
    accessTokensRoute,
    headRoute,
    usersRoute,
    forbiddenRoute,
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
