import axios, {
  type AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@config/env";

declare module "axios" {
  interface AxiosRequestConfig {
    _skipAuthRefresh?: boolean;
  }

  interface InternalAxiosRequestConfig {
    _skipAuthRefresh?: boolean;
  }
}

/**
 * Single axios instance for the whole app.
 *
 * Auth model: backend sets two httpOnly cookies (ACCESS_TOKEN, REFRESH_TOKEN) on login.
 * Browser sends them automatically. JS never reads, writes, or sees the tokens.
 *
 * `withCredentials: true` is REQUIRED for cookies to flow cross-origin. Backend CORS:
 *   Access-Control-Allow-Origin: <exact origin>   (no wildcard with credentials)
 *   Access-Control-Allow-Credentials: true
 *   Access-Control-Allow-Headers: Content-Type, X-XSRF-TOKEN, ...
 *
 * Axios will also read an XSRF-TOKEN cookie (if the backend sets one) and echo it
 * back as the X-XSRF-TOKEN header - standard CSRF double-submit defence.
 */
export const http: AxiosInstance = axios.create({
  baseURL: env.isDev ? "/hrm-api" : env.apiUrl,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 20_000,
});

/* ------------------------------------------------------------
 * Injected hooks - keep the http client store-agnostic.
 * ------------------------------------------------------------ */

let onUnauthorized: (() => void) | null = null;
let refreshEndpoint: string | null = null;

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

/**
 * Provide the /auth/refresh URL so the 401 interceptor can attempt a silent retry.
 * If unset, the interceptor falls back to "clear auth + redirect to /login".
 */
export function setRefreshEndpoint(url: string): void {
  refreshEndpoint = url;
}

/* ------------------------------------------------------------
 * Refresh-on-401 interceptor.
 *
 * If the access cookie expires mid-session, the next API call gets a 401.
 * We then:
 *   1. POST to the refresh endpoint (browser sends REFRESH_TOKEN cookie automatically).
 *   2. Backend rotates both cookies.
 *   3. We retry the original request transparently.
 *   4. If refresh itself fails - clear local auth state - router sends user to /login.
 *
 * Concurrency: if multiple requests 401 at once, only ONE refresh fires;
 * the rest wait in a queue.
 * ------------------------------------------------------------ */

export interface AuthAwareRequestConfig extends AxiosRequestConfig {
  _skipAuthRefresh?: boolean;
}

interface RetriedConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  _skipAuthRefresh?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function subscribeToRefresh(cb: (success: boolean) => void): void {
  refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(success: boolean): void {
  const subs = refreshSubscribers;
  refreshSubscribers = [];
  subs.forEach((cb) => cb(success));
}

http.interceptors.request.use((config) => {
  try {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("hrm_token") || window.sessionStorage.getItem("hrm_token")
        : null;
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers ?? new AxiosHeaders();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* ignore */
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriedConfig | undefined;
    const status = error.response?.status;

    // Not a 401, or we have no config to retry - reject as-is.
    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    // Avoid loops: a failed login or a failed refresh should not trigger another refresh.
    const url = original.url ?? "";
    if (
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/logout")
    ) {
      if (url.includes("/auth/refresh")) onUnauthorized?.();
      return Promise.reject(error);
    }

    // Some auth checks intentionally use 401 to mean "not logged in".
    if (original._skipAuthRefresh) {
      return Promise.reject(error);
    }

    // Already retried once - give up and clear auth.
    if (original._retried) {
      onUnauthorized?.();
      return Promise.reject(error);
    }

    // No refresh endpoint configured - behave like the simple "clear + redirect" model.
    if (!refreshEndpoint) {
      onUnauthorized?.();
      return Promise.reject(error);
    }

    original._retried = true;

    // A refresh is already in flight - queue this request and retry once it finishes.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh((success) => {
          if (success) {
            resolve(http.request(original));
          } else {
            reject(error);
          }
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken =
        typeof window !== "undefined" ? localStorage.getItem("hrm_refresh_token") : null;
      const headers: Record<string, string> = {};
      if (refreshToken) {
        headers["X-Refresh-Token"] = `Bearer ${refreshToken}`;
      }

      const response = await http.post(
        refreshEndpoint,
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

      notifyRefreshSubscribers(true);
      return http.request(original);
    } catch (refreshError) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hrm_token");
        localStorage.removeItem("hrm_refresh_token");
        localStorage.removeItem("mbg.auth.user");
        sessionStorage.removeItem("hrm_token");
        sessionStorage.removeItem("hrm_refresh_token");
        sessionStorage.removeItem("mbg.auth.user");
      }
      notifyRefreshSubscribers(false);
      onUnauthorized?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/* ------------------------------------------------------------
 * API envelope - matches backend shape: { status, message, data, timestamp }.
 * ------------------------------------------------------------ */

export interface ApiEnvelope<T> {
  status: string;
  message: string;
  data: T;
  timestamp: string;
}

export async function apiGet<T>(url: string, config?: AuthAwareRequestConfig): Promise<T> {
  const { data } = await http.get<ApiEnvelope<T>>(url, config);
  return data.data;
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await http.post<ApiEnvelope<T>>(url, body, config);
  return data.data;
}

export async function apiPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await http.put<ApiEnvelope<T>>(url, body, config);
  return data.data;
}

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await http.patch<ApiEnvelope<T>>(url, body, config);
  return data.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await http.delete<ApiEnvelope<T>>(url, config);
  return data.data;
}

// Re-exporting AxiosHeaders so callers don't need to import from axios directly.
export { AxiosHeaders };
