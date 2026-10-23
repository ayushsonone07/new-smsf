import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@app/store";

import {
  selectAuthInitialized,
  selectAuthRole,
  selectIsAuthenticated,
  useRole,
  type Role,
} from "@features/auth";
import { SplashScreen } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";

interface RequireRoleProps {
  allowed: Role | Role[];
  /** Optional override — defaults to /403. */
  forbiddenPath?: string;
  children: ReactNode;
}

/**
 * Route guard: requires both authentication AND a matching role.
 *
 * Same caveat as `useRole`: this is a UX gate. The backend MUST still
 * authorize every API call — never rely on this alone for security.
 */
export function RequireRole({
  allowed,
  forbiddenPath = ROUTES.forbidden,
  children,
}: RequireRoleProps) {
  const initialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  // Subscribe to role changes (component re-renders when role changes).
  useAppSelector(selectAuthRole);
  const hasRole = useRole(allowed);
  const location = useLocation();

  if (!initialized) return <SplashScreen />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (!hasRole) {
    return <Navigate to={forbiddenPath} replace />;
  }

  return <>{children}</>;
}
