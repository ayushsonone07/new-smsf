import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AdminLayout } from '../components/layout/AdminLayout'
import { DepartmentManagementPage } from '../features/departments/pages/DepartmentManagementPage'
import { FeaturePermissionsPage } from '../features/permissions/pages/FeaturePermissionsPage'

const rootRoute = createRootRoute({
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
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
    throw redirect({ to: '/admin' })
  },
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: DepartmentManagementPage,
})

const departmentFeaturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/departments/$departmentId',
  component: FeaturePermissionsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute,
  departmentFeaturesRoute,
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
