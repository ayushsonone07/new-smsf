import { useEffect, type ReactNode } from "react";

import { matchPath, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@app/store";

import { bootstrapAuth, selectAuthInitialized } from "@features/auth";
import { SplashScreen } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";

interface AuthBootstrapProps {
  children: ReactNode;
}

/**
 * Mount once at the top of the route tree.
 *
 * On first paint:
 *   1. Dispatches /auth/me to ask the server "is this httpOnly cookie still valid?"
 *   2. Shows a full-page splash until that answer arrives.
 *   3. After bootstrap completes (authenticated or not), renders children.
 *
 * Without this step, the app would flash unauthenticated UI on every refresh
 * because the cookie is invisible to JS.
 */
const PUBLIC_BOOTSTRAP_ROUTES = [
  ROUTES.home,
  ROUTES.login,
  ROUTES.setPassword,
  ROUTES.resetPassword,
  ROUTES.publicOnboarding,
  ROUTES.forbidden,
];

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector(selectAuthInitialized);
  const location = useLocation();
  const isPublicRoute = PUBLIC_BOOTSTRAP_ROUTES.some((path) =>
    matchPath({ path, end: true }, location.pathname),
  );

  useEffect(() => {
    if (isPublicRoute) return;

    void dispatch(bootstrapAuth());
  }, [dispatch, isPublicRoute]);

  if (!isPublicRoute && !initialized) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
