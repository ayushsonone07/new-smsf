import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@app/store";

import { selectAuthInitialized, selectIsAuthenticated } from "@features/auth";
import { hasPermission, type Permission } from "@features/dashboard";
import { SplashScreen } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";

interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const initialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role ?? null);
  const location = useLocation();

  if (!initialized) return <SplashScreen />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (!role || !hasPermission(role, permission)) {
    return <Navigate to={ROUTES.forbidden} replace />;
  }

  return <>{children}</>;
}
