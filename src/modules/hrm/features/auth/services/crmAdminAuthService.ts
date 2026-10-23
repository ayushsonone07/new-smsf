import axios, { isAxiosError } from "axios";

import { http } from "@shared/services";

import { readCachedUser, parseJwtPayload } from "../store";
import { normalizeAuthUser, normalizeRole, type AuthUser, type Role } from "../types";

const CRM_ADMIN_LOGIN_URL = "/api/v1/auth/crm-admin-login";
const CRM_API_KEY = "dev-hrm-api-key-8f3Kx92Lm7Qa";

export interface CrmAdminLoginResponse {
  token: string;
  refreshToken?: string;
  userId: number;
  email: string;
  role: string;
}

/**
 * Authenticates the CRM SuperAdmin into the HRM module.
 *
 * Calls the CRM backend (or directly HRM backend) to validate the SuperAdmin role and get an HRM token.
 * The token is stored in localStorage for subsequent HRM API calls.
 */
export const crmAdminAuthService = {
  /**
   * Call the CRM admin login endpoint to get an HRM token.
   * Returns the token data on success, throws on failure.
   */
  async loginWithCrmAdmin(): Promise<CrmAdminLoginResponse> {
    let data: any = null;

    // First attempt: call HRM directly via /hrm-api proxy (guaranteed to match frontend's active HRM backend)
    try {
      const hrmResponse = await http.post(
        CRM_ADMIN_LOGIN_URL,
        { role: "SUPER_ADMIN" },
        {
          headers: {
            "X-CRM-API-KEY": CRM_API_KEY,
          },
          timeout: 4000,
        },
      );
      const raw = hrmResponse.data;
      data = raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw;
    } catch (directErr) {
      console.warn("Direct /hrm-api admin login failed, attempting SMSB fallback:", directErr);
    }

    // Fallback: try TaskCRM backend
    if (!data || (!data.token && !data.accessToken)) {
      try {
        const smsbResponse = await axios.post(
          "/api/v1/auth/crm-admin-login",
          { role: "SUPER_ADMIN" },
          {
            headers: {
              "Content-Type": "application/json",
              "X-CRM-API-KEY": CRM_API_KEY,
            },
            timeout: 4000,
          },
        );
        const raw = smsbResponse.data;
        data = raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw;
      } catch (fallbackErr) {
        console.error("TaskCRM backend admin login fallback also failed:", fallbackErr);
      }
    }

    if (!data) {
      throw new Error("Empty response received from CRM Admin login");
    }

    const token = data.token || data.accessToken;
    const refreshToken =
      data.refreshToken || data.refresh_token || (data.data?.refreshToken) || (data.data?.refresh_token);
    const userId = Number(data.userId ?? data.id ?? 1);
    const email = data.email || "admin@hrm.com";
    const role = (normalizeRole(data.role) as Role) || "ADMIN";

    if (!token) {
      throw new Error("Token missing from CRM Admin login response");
    }

    // Store the HRM token, refresh token and user in localStorage
    localStorage.setItem("hrm_token", token);
    if (refreshToken) {
      localStorage.setItem("hrm_refresh_token", refreshToken);
    }
    const hrmUser: AuthUser = {
      id: userId,
      email,
      name: data.name || (email.includes("@") ? email.split("@")[0] : "Admin"),
      role,
    };
    localStorage.setItem("mbg.auth.user", JSON.stringify(hrmUser));

    return {
      token,
      refreshToken: refreshToken || undefined,
      userId,
      email,
      role,
    };
  },

  /**
   * Returns cached auth user from localStorage or derives it from token.
   */
  getCachedUser(): AuthUser | null {
    return readCachedUser();
  },

  /**
   * Check if current session user is a CRM SuperAdmin.
   */
  isCurrentSessionSuperAdmin(): boolean {
    try {
      const smsfRaw = sessionStorage.getItem("smsf.auth.session");
      if (smsfRaw) {
        try {
          const parsed = JSON.parse(smsfRaw);
          const r = String(parsed?.user?.role || "").toUpperCase().replace(/[- ]/g, "_");
          if (r === "ADMIN" || r === "SUPERADMIN" || r === "SUPER_ADMIN") {
            return true;
          }
        } catch {}
      }

      const rawRole = sessionStorage.getItem("role") || localStorage.getItem("role") || "";
      const normalizedRole = rawRole.toUpperCase().replace(/[- ]/g, "_");
      if (normalizedRole === "SUPERADMIN" || normalizedRole === "SUPER_ADMIN") {
        return true;
      }

      const getCookie = (name: string): string | null => {
        if (typeof document === "undefined") return null;
        return document.cookie.split("; ").reduce((r, v) => {
          const parts = v.split("=");
          return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, null as string | null);
      };

      const crmToken = sessionStorage.getItem("token") || getCookie("token");
      if (crmToken) {
        const payload = parseJwtPayload(crmToken);
        if (payload) {
          const tokenRole = String(payload.role || payload.userRole || payload.authorities || "")
            .toUpperCase()
            .replace(/[- ]/g, "_");
          if (
            tokenRole === "SUPERADMIN" ||
            tokenRole === "SUPER_ADMIN" ||
            tokenRole.includes("SUPER_ADMIN")
          ) {
            return true;
          }
        }
      }
    } catch {
      // ignore
    }
    return false;
  },

  /**
   * Check if a valid HRM token exists in localStorage.
   */
  hasValidToken(): boolean {
    const token = localStorage.getItem("hrm_token");
    return !!token;
  },

  /**
   * Get the stored HRM token.
   */
  getToken(): string | null {
    return localStorage.getItem("hrm_token");
  },

  /**
   * Clear the stored HRM token, refresh token and cached user.
   */
  clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hrm_token");
      localStorage.removeItem("hrm_refresh_token");
      localStorage.removeItem("mbg.auth.user");
      sessionStorage.removeItem("hrm_token");
      sessionStorage.removeItem("hrm_refresh_token");
      sessionStorage.removeItem("mbg.auth.user");
    }
  },

  /**
   * Get the stored HRM refresh token.
   */
  getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hrm_refresh_token");
    }
    return null;
  },

  /**
   * Validate the current HRM token by calling the /auth/me endpoint.
   * Returns the user data if valid, null otherwise.
   */
  async validateToken(): Promise<AuthUser | null> {
    const cached = readCachedUser();
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await http.get<{ status?: string; message?: string; data?: any }>(
        "/api/v1/auth/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          _skipAuthRefresh: true,
          timeout: 4000,
        } as any,
      );

      const raw = response.data;
      const rawUser = raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw;
      if (rawUser && (rawUser.id || rawUser.email)) {
        const user = normalizeAuthUser(rawUser);
        localStorage.setItem("mbg.auth.user", JSON.stringify(user));
        return user;
      }
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          this.clearToken();
          return null;
        }
        // If it's a network error or 5xx server error, rethrow so caller knows backend is unreachable
        if (!error.response || (error.response.status >= 500 && error.response.status <= 504)) {
          throw error;
        }
      }
      return null;
    }
  },
};
