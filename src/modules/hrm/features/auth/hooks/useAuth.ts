import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@app/store";
import { ROUTES } from "@shared/constants";

import {
  logoutUser,
  selectAuthError,
  selectAuthRole,
  selectAuthStatus,
  selectAuthUser,
  selectIsAuthenticated,
} from "../store";

/**
 * Convenience hook — read the current auth state and trigger logout.
 *
 * Note: the underlying selectors are role-aware but role checks should go
 * through `useRole` for clarity.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector(selectAuthUser);
  const role = useAppSelector(selectAuthRole);
  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const logout = useCallback(async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      // Local session is cleaned up regardless of network status
    } finally {
      navigate(ROUTES.login, { replace: true, state: { forceShowForm: true } });
    }
  }, [dispatch, navigate]);

  return { user, role, status, error, isAuthenticated, logout };
}
