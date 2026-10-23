import { lazy, Suspense } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "@features/auth";
import { ROUTES } from "@shared/constants";

import { DashboardSkeleton } from "./DashboardSkeleton";

const AdminDashboardPage = lazy(() => import("../pages/AdminDashboardPage"));
const HrDashboardPage = lazy(() => import("../pages/HrDashboardPage"));
const HrHeadDashboardPage = lazy(() => import("../pages/HrHeadDashboardPage"));
const ManagerDashboardPage = lazy(() => import("../pages/ManagerDashboardPage"));
const SubHrDashboardPage = lazy(() => import("../pages/SubHrDashboardPage"));
const EmployeeDashboardPage = lazy(() => import("../pages/EmployeeDashboardPage"));

export function RoleDashboardRouter() {
  const { role, status } = useAuth();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (!role) {
    return <Navigate to={ROUTES.login} replace />;
  }

  switch (role) {
    case "ADMIN":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <AdminDashboardPage />
        </Suspense>
      );
    case "HR":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <HrDashboardPage />
        </Suspense>
      );
    case "HR_HEAD":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <HrHeadDashboardPage />
        </Suspense>
      );
    case "SUB_HR":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <SubHrDashboardPage />
        </Suspense>
      );
    case "MANAGER":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <ManagerDashboardPage />
        </Suspense>
      );
    case "EMPLOYEE":
      return (
        <Suspense fallback={<DashboardSkeleton />}>
          <EmployeeDashboardPage />
        </Suspense>
      );
    default:
      return <Navigate to={ROUTES.login} replace />;
  }
}
