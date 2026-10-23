import { lazy } from "react";

import { Provider } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  AuthBootstrap,
  RequireAnyPermission,
  RequireAuth,
  RequirePermission,
  RequireRole,
} from "@app/router";
import { store } from "@app/store";

import { AdminHrUsersPage } from "@features/admin";
import { AnnouncementsPage } from "@features/announcements";
import { AuditLogsPage } from "@features/audit-logs";
import { LoginPage, ResetPasswordPage, SetPasswordPage } from "@features/auth";
import { CrmAdminHrmGateway } from "@features/auth/components/CrmAdminHrmGateway";
import { RoleDashboardRouter, TimeAttendanceOverviewPage } from "@features/dashboard";
import { HolidaysPage } from "@features/holidays";
import {
  AllCandidatesPage,
  AttendancePage,
  DepartmentsPage,
  DesignationsPage,
  EmployeesPage,
  EmployeeProfilePage,
  EmployeeAttendanceHistoryPage,
  EmployeeOnboardingPage,
  OnboardingPage,
  PublicOnboardingPage,
} from "@features/hr";
import { LeavePage } from "@features/leave";
import { PayrollPage, PayslipsPage } from "@features/payroll";
import { PerformancePage } from "@features/performance";
import { ReportsPage } from "@features/reports";
import { RoleBasedAccessPage, SettingsPage, UpdateProfilePage } from "@features/settings";
import { MyTasksPage } from "@features/tasks";
import { NotificationsPage } from "@features/notifications";
import { AppErrorBoundary } from "@shared/components/feedback";
import { AuthenticatedLayout } from "@shared/components/layout";
import { ROUTES } from "@shared/constants";
import { rel } from "@shared/constants/routes";

import { ModulePlaceholderPage } from "./pages/ModulePlaceholderPage";

const LazyInterviewsPage = lazy(() => import("./pages/InterviewsPage"));

function App() {
  return (
    <Provider store={store}>
      <AppErrorBoundary>
        <AuthBootstrap>
          <CrmAdminHrmGateway>
          <Routes>
            <Route path={rel(ROUTES.login)} element={<LoginPage />} />
            <Route path={rel(ROUTES.setPassword)} element={<SetPasswordPage />} />
            <Route path={rel(ROUTES.resetPassword)} element={<ResetPasswordPage />} />
            <Route path={rel(ROUTES.publicOnboarding)} element={<PublicOnboardingPage />} />
            <Route path={rel(ROUTES.forbidden)} element={<ForbiddenPage />} />

            {/* Authenticated layout Ã¢â‚¬â€ provides AppShell with Sidebar + TopBar */}
            <Route
              element={
                <RequireAuth>
                  <AuthenticatedLayout />
                </RequireAuth>
              }
            >
              <Route path={rel(ROUTES.dashboard)} element={<RoleDashboardRouter />} />

              <Route
                path={rel(ROUTES.myTasks)}
                element={
                  <RequireRole allowed={["HR_HEAD", "HR", "SUB_HR", "EMPLOYEE"]}>
                    <MyTasksPage />
                  </RequireRole>
                }
              />

              <Route
                path={rel(ROUTES.timeAttendanceOverview)}
                element={
                  <RequireAnyPermission permissions={["attendance:view_all", "leave:view_all"]}>
                    <TimeAttendanceOverviewPage />
                  </RequireAnyPermission>
                }
              />

              <Route
                path={rel(ROUTES.employees)}
                element={
                  <RequirePermission permission="employee:directory">
                    <EmployeesPage />
                  </RequirePermission>
                }
              />
              <Route
                path={rel(ROUTES.employeeProfile)}
                element={
                  // EMPLOYEE self-access requires backend employeeId mapping
                  <RequirePermission permission="employee:view">
                    <EmployeeProfilePage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.employeeAttendanceHistory)}
                element={
                  <RequireAnyPermission
                    permissions={["attendance:view_all", "attendance:view_self"]}
                  >
                    <EmployeeAttendanceHistoryPage />
                  </RequireAnyPermission>
                }
              />

              <Route
                path={rel(ROUTES.departments)}
                element={
                  <RequirePermission permission="department:manage">
                    <DepartmentsPage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.designations)}
                element={
                  <RequirePermission permission="designation:manage">
                    <DesignationsPage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.candidates)}
                element={
                  <RequirePermission permission="candidate:view">
                    <AllCandidatesPage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.attendance)}
                element={
                  <RequireAnyPermission
                    permissions={["attendance:view_all", "attendance:view_self"]}
                  >
                    <AttendancePage />
                  </RequireAnyPermission>
                }
              />

              <Route
                path={rel(ROUTES.employeeOnboarding)}
                element={
                  <RequirePermission permission="onboarding:manage">
                    <EmployeeOnboardingPage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.interviews)}
                element={
                  <RequirePermission permission="recruitment:view">
                    <LazyInterviewsPage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.onboarding)}
                element={
                  <RequirePermission permission="onboarding:manage">
                    <OnboardingPage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.leave)}
                element={
                  <RequireAnyPermission permissions={["leave:view_all", "leave:view_self"]}>
                    <LeavePage />
                  </RequireAnyPermission>
                }
              />

              <Route path={rel(ROUTES.holidays)} element={<HolidaysPage />} />

              <Route
                path={rel(ROUTES.payroll)}
                element={
                  <RequireAnyPermission
                    permissions={["payroll:view_all", "payroll:view_self", "payroll:manage"]}
                  >
                    <PayrollPage />
                  </RequireAnyPermission>
                }
              />

              <Route
                path={rel(ROUTES.payslips)}
                element={
                  <RequireAnyPermission
                    permissions={["payroll:view_all", "payroll:view_self", "payroll:manage"]}
                  >
                    <PayslipsPage />
                  </RequireAnyPermission>
                }
              />

              <Route
                path={rel(ROUTES.shifts)}
                element={
                  <ModulePlaceholderPage
                    title="Shifts"
                    module="Shifts"
                    description="Manage work shifts, rotations, and schedules."
                  />
                }
              />

              <Route
                path={rel(ROUTES.performance)}
                element={
                  <RequirePermission permission="performance:view">
                    <PerformancePage />
                  </RequirePermission>
                }
              />

              <Route
                path={rel(ROUTES.reports)}
                element={
                  <RequireAnyPermission permissions={["reports:view_all", "reports:view_limited"]}>
                    <ReportsPage />
                  </RequireAnyPermission>
                }
              />

              <Route
                path={rel(ROUTES.announcements)}
                element={
                  <RequirePermission permission="announcements:view">
                    <AnnouncementsPage />
                  </RequirePermission>
                }
              />

              <Route path={rel(ROUTES.notifications)} element={<NotificationsPage />} />

              <Route
                path={rel(ROUTES.documents)}
                element={
                  <ModulePlaceholderPage
                    title="Documents"
                    module="Documents"
                    description="Access company policies, forms, and documents."
                  />
                }
              />

              <Route
                path={rel(ROUTES.help)}
                element={
                  <ModulePlaceholderPage
                    title="Help & Support"
                    module="Help"
                    description="Get help, raise tickets, and find resources."
                  />
                }
              />

              <Route path={rel(ROUTES.settings)} element={<SettingsPage />} />
              <Route path={rel(ROUTES.updateProfile)} element={<UpdateProfilePage />} />

              <Route
                path={rel(ROUTES.adminRoles)}
                element={
                  <RequireRole allowed={["ADMIN"]}>
                    <RoleBasedAccessPage />
                  </RequireRole>
                }
              />

              <Route
                path={rel(ROUTES.adminHrUsers)}
                element={
                  <RequireRole allowed={["ADMIN", "HR_HEAD"]}>
                    <AdminHrUsersPage />
                  </RequireRole>
                }
              />

              <Route
                path={rel(ROUTES.adminAuditLogs)}
                element={
                  <RequireRole allowed={["ADMIN"]}>
                    <AuditLogsPage />
                  </RequireRole>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
          </Routes>
          </CrmAdminHrmGateway>
        </AuthBootstrap>
      </AppErrorBoundary>
    </Provider>
  );
}

function ForbiddenPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-danger">403</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          You don&apos;t have access to this page.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask your HR admin if you think this is a mistake.
        </p>
      </div>
    </div>
  );
}

export default App;
