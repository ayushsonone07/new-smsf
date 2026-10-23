import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@app/store";

import {
  selectAuthInitialized,
  selectIsAuthenticated,
} from "@features/auth";
import { SplashScreen } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Route guard: only renders children if the user is authenticated.
 * - While bootstrap is in flight, shows the splash.
 * - When unauthenticated, redirects to /login and remembers the attempted URL
 *   in `location.state.from` so the page can route back after login.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const initialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!initialized) return <SplashScreen />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
