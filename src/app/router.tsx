import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AdminLayout } from '../components/layout/AdminLayout'
import { PageLayout } from '../components/layout/PageLayout'
import { ErrorState } from '../components/ui/ErrorState'
import { DepartmentManagementPage } from '../features/departments/pages/DepartmentManagementPage'
import { DepartmentDashboardPage } from '../features/departments/pages/DepartmentDashboardPage'
import { DepartmentCustomersPage } from '../features/departments/pages/DepartmentCustomersPage'
import { DepartmentHelpCenterPage } from '../features/departments/pages/DepartmentHelpCenterPage'
import { DepartmentServicesPage } from '../features/departments/pages/DepartmentServicesPage'
import { FeaturePermissionsPage } from '../features/permissions/pages/FeaturePermissionsPage'

const rootRoute = createRootRoute({
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
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
  adminRoute,
  departmentFeaturesRoute,
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
