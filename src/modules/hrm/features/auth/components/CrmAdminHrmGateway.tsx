import { useEffect, useRef, useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@app/store";
import {
  bootstrapAuth,
  selectAuthUser,
  selectIsAuthenticated,
  setAuthUser,
  type AuthUser,
} from "@features/auth";
import { crmAdminAuthService } from "../services/crmAdminAuthService";
import { ROUTES } from "@shared/constants";
import { checkHrmServiceHealth } from "@shared/services";
import { CrmToHrmLoader } from "@/modules/hrm/components";

interface CrmAdminHrmGatewayProps {
  children: React.ReactNode;
}

/**
 * Gateway component that handles CRM SuperAdmin → HRM authentication.
 *
 * Flow:
 * 1. Proactively verifies if HRM backend is reachable before rendering.
 * 2. If HRM service is down, renders CrmToHrmLoader with offline state and 3 actions:
 *    - Back to Login (CRM login: /login)
 *    - Login Again (re-attempts HRM health check & connection)
 *    - Login with HRM (routes to /hrm/login with form unlocked)
 * 3. While connecting, renders CrmToHrmLoader animation from crmTohrm.html.
 * 4. If authentication succeeds, displays "Access Granted" animation and renders HRM app.
 */
export function CrmAdminHrmGateway({ children }: CrmAdminHrmGatewayProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isReduxAuthenticated = useAppSelector(selectIsAuthenticated);
  const reduxUser = useAppSelector(selectAuthUser);

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authAttemptedRef = useRef(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Skip health check on public routes (login, set-password, etc.)
  // Use matchPath to properly handle parameterized routes like /hrm/onboarding/:token
  const isPublicRoute = [
    ROUTES.login,
    ROUTES.setPassword,
    ROUTES.resetPassword,
    ROUTES.publicOnboarding,
    ROUTES.forbidden,
  ].some((path) => matchPath({ path, end: true }, location.pathname));

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const authenticate = async () => {
    // Skip health check on public routes (login, set-password, etc.)
    if (isPublicRoute) {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      // 1. Proactively verify that HRM backend is online and reachable
      const health = await checkHrmServiceHealth(true, 3500);
      if (!health.isOnline) {
        setError(health.error || "The HRM backend service is currently offline or unreachable.");
        setIsLoading(false);
        return;
      }

      // 2. If user is already authenticated in Redux and service is alive, pass through
      if (isReduxAuthenticated && reduxUser) {
        setIsAuthenticated(true);
        setIsLoading(false);
        setIsSuccess(false);
        return;
      }

      // 3. Check if we already have a valid HRM token
      if (crmAdminAuthService.hasValidToken()) {
        const user = await crmAdminAuthService.validateToken();
        if (user) {
          dispatch(
            setAuthUser({
              user,
              token: crmAdminAuthService.getToken() || undefined,
              refreshToken: crmAdminAuthService.getRefreshToken() || undefined,
            }),
          );
          setIsSuccess(true);
          setIsLoading(false);
          successTimerRef.current = setTimeout(() => {
            setIsSuccess(false);
            setIsAuthenticated(true);
          }, 800);
          return;
        }
      }

      // 4. Only attempt CRM SuperAdmin SSO bypass if user is actually a CRM SuperAdmin
      const isCrmSuperAdmin = crmAdminAuthService.isCurrentSessionSuperAdmin();

      if (isCrmSuperAdmin) {
        const authData = await crmAdminAuthService.loginWithCrmAdmin();
        if (authData && authData.token) {
          const hrmUser: AuthUser = {
            id: authData.userId,
            email: authData.email,
            name: authData.email ? authData.email.split("@")[0] : "Admin",
            role: (authData.role as any) || "ADMIN",
          };
          dispatch(
            setAuthUser({
              user: hrmUser,
              token: authData.token,
              refreshToken: authData.refreshToken,
            }),
          );
          setIsSuccess(true);
          setIsLoading(false);
          successTimerRef.current = setTimeout(() => {
            setIsSuccess(false);
            setIsAuthenticated(true);
          }, 800);
          return;
        }
      }

      // 5. Not a CRM SuperAdmin and no valid token -> redirect to HRM login page
      setIsLoading(false);
      navigate(ROUTES.login, { replace: true });
    } catch (err: any) {
      console.error("CRM Admin HRM authentication failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "The HRM backend service is currently offline or unreachable.";
      setError(msg);
      setIsLoading(false);
      setIsSuccess(false);
    }
  };

  useEffect(() => {
    if (authAttemptedRef.current) return;
    authAttemptedRef.current = true;

    void authenticate();
  }, []);

  if (isLoading || error || isSuccess) {
    return (
      <CrmToHrmLoader
        isLoading={isLoading}
        isSuccess={isSuccess}
        error={error}
        onBackToLogin={() => navigate("/login", { replace: true })}
        onLoginAgain={() => {
          authAttemptedRef.current = false;
          void authenticate();
        }}
        onLoginWithHrm={() =>
          navigate(ROUTES.login, { replace: true, state: { forceShowForm: true } })
        }
      />
    );
  }

  // On public routes (login, set-password, etc.), always render children (LoginPage)
  // On protected routes, only render if authenticated
  if (isPublicRoute || isAuthenticated || isReduxAuthenticated) {
    return <>{children}</>;
  }

  return null;
}

