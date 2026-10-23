import { isAxiosError } from "axios";

import { apiGet, apiPatch, apiPost, http, type ApiEnvelope } from "@shared/services";

import { normalizeAuthUser, normalizeLoginResponse } from "../types";

import { AUTH_ENDPOINTS } from "./endpoints";

import type {
  AuthUser,
  EmployeeProfile,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ForgotPasswordResult,
  LoginCredentials,
  LoginResponse,
  ResetPasswordRequest,
  UpdateProfileInput,
} from "../types";

/**
 * Auth service - thin wrapper around the HTTP client.
 *
 * Cookies are httpOnly + set/cleared by the backend, so JS never touches the tokens.
 * Each method returns only the JSON body the slice needs.
 */
export const authService = {
  /**
   * POST /api/v1/auth/login
   * Backend behaviour:
   *   - Sets two httpOnly cookies (ACCESS_TOKEN, REFRESH_TOKEN).
   *   - Returns user + token metadata in the body.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiPost<LoginResponse, LoginCredentials>(AUTH_ENDPOINTS.login, credentials);
    return normalizeLoginResponse(response);
  },

  /**
   * POST /api/v1/auth/refresh
   * Backend behaviour:
   *   - Reads REFRESH_TOKEN cookie or body/header, rotates tokens.
   */
  async refresh(): Promise<void> {
    const refreshToken =
      typeof window !== "undefined" ? localStorage.getItem("hrm_refresh_token") : null;
    const headers: Record<string, string> = {};
    if (refreshToken) {
      headers["X-Refresh-Token"] = `Bearer ${refreshToken}`;
    }

    const response = await http.post(
      AUTH_ENDPOINTS.refresh,
      refreshToken ? { refreshToken, refresh_token: refreshToken } : undefined,
      {
        headers,
        _skipAuthRefresh: true,
      },
    );

    const raw = response.data;
    const data = raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw;
    const newToken = data?.token || data?.accessToken || raw?.token || raw?.accessToken;
    const newRefreshToken =
      data?.refreshToken || data?.refresh_token || raw?.refreshToken || raw?.refresh_token;

    if (newToken && typeof window !== "undefined") {
      localStorage.setItem("hrm_token", newToken);
    }
    if (newRefreshToken && typeof window !== "undefined") {
      localStorage.setItem("hrm_refresh_token", newRefreshToken);
    }
  },

  /**
   * POST /api/v1/auth/logout
   * Sends refreshToken and accessToken in body and headers so any backend contract is satisfied.
   * In all cases, wipes local session storage and tokens.
   */
  async logout(): Promise<void> {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrm_token") : null;
    const refreshToken =
      typeof window !== "undefined" ? localStorage.getItem("hrm_refresh_token") : null;

    const body: Record<string, any> = {};
    if (refreshToken) {
      body.refreshToken = refreshToken;
      body.refresh_token = refreshToken;
    }
    if (token) {
      body.token = token;
      body.accessToken = token;
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (refreshToken) {
      headers["X-Refresh-Token"] = `Bearer ${refreshToken}`;
    }

    try {
      await http.post(AUTH_ENDPOINTS.logout, Object.keys(body).length > 0 ? body : undefined, {
        headers,
        _skipAuthRefresh: true,
        timeout: 5000,
      });
    } catch (err) {
      console.warn("Backend logout request encountered an error (continuing with local cleanup):", err);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hrm_token");
        localStorage.removeItem("hrm_refresh_token");
        localStorage.removeItem("mbg.auth.user");
        sessionStorage.removeItem("hrm_token");
        sessionStorage.removeItem("hrm_refresh_token");
        sessionStorage.removeItem("mbg.auth.user");
      }
    }
  },

  /**
   * PATCH /api/v1/auth/set-password?token=…
   * Sets the password for a newly-created employee using the one-time token from
   * the setup email. The account becomes active only once this succeeds AND
   * onboarding is submitted/verified (backend enforces both).
   */
  async setPassword(token: string, password: string): Promise<void> {
    await http.patch(AUTH_ENDPOINTS.setPassword, { password }, { params: { token } });
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const response = await http.post<ApiEnvelope<ForgotPasswordResponse | null>>(
      AUTH_ENDPOINTS.forgotPassword,
      { email } satisfies ForgotPasswordRequest,
    );
    return { message: response.data.message, data: response.data.data };
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    await http.patch(
      AUTH_ENDPOINTS.resetPassword,
      payload,
    );
  },

  /**
   * GET /api/v1/auth/me - pending on backend.
   * Once available, called on app boot to rehydrate the user object from the cookie.
   * Until then, the slice uses a localStorage stopgap (see authSlice.ts).
   *
   * Returns `null` on 401 (treated as "not logged in", not an error).
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await apiGet<AuthUser>(AUTH_ENDPOINTS.me, { _skipAuthRefresh: true });
      return normalizeAuthUser(user);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  /**
   * GET /api/v1/auth/profile
   * Returns the authenticated user's own employee profile (any role).
   */
  async getMyProfile(): Promise<EmployeeProfile> {
    return apiGet<EmployeeProfile>(AUTH_ENDPOINTS.profile);
  },

  /**
   * PATCH /api/v1/auth/profile
   * Updates the authenticated user's own personal fields (name, email, phone).
   */
  async updateMyProfile(input: UpdateProfileInput): Promise<EmployeeProfile> {
    return apiPatch<EmployeeProfile, UpdateProfileInput>(AUTH_ENDPOINTS.profile, input);
  },
};
