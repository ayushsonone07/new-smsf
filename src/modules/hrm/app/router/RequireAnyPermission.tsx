import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@app/store";

import { selectAuthInitialized, selectIsAuthenticated } from "@features/auth";
import { hasPermission, type Permission } from "@features/dashboard";
import { SplashScreen } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";

interface RequireAnyPermissionProps {
  permissions: Permission[];
  children: ReactNode;
}

export function RequireAnyPermission({ permissions, children }: RequireAnyPermissionProps) {
  const initialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role ?? null);
  const location = useLocation();

  if (!initialized) return <SplashScreen />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (!role || !permissions.some((perm) => hasPermission(role, perm))) {
    return <Navigate to={ROUTES.forbidden} replace />;
  }

  return <>{children}</>;
}
