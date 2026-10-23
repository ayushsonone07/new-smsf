import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { isAxiosError } from "axios";

import { authService } from "../services";

import { normalizeAuthUser } from "../types";
import type { AuthState, AuthUser, LoginCredentials, LoginResponse, Role } from "../types";

/* - localStorage stopgap - */
/**
 * The backend ships GET /auth/me (called via bootstrapAuth). We also cache the user object in localStorage
 * so that a page refresh can rehydrate identity (the cookie persists but JS state
 * doesn't).
 *
 * What's cached: user id, email, name, role - NOT credentials. An XSS reading
 * this can lie about who the user is locally, but cannot impersonate them
 * server-side (tokens live in httpOnly cookies the script can't read).
 *
 * USER_CACHE_KEY is a compatibility layer; bootstrapAuth above calls authService.getCurrentUser() which hits /auth/me. Replace with
 * `authService.getCurrentUser()` in `bootstrapAuth`.
 */
export const USER_CACHE_KEY = "mbg.auth.user";

export function parseJwtPayload(token: string): any {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function purgeAuthStorage(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(USER_CACHE_KEY);
    window.localStorage.removeItem("hrm_token");
    window.localStorage.removeItem("hrm_refresh_token");
    window.sessionStorage.removeItem(USER_CACHE_KEY);
    window.sessionStorage.removeItem("hrm_token");
    window.sessionStorage.removeItem("hrm_refresh_token");
    // Clear CRM-level session data so CrmAdminHrmGateway doesn't auto re-authenticate
    // the user via CRM SuperAdmin SSO bypass on the next page refresh.
    window.sessionStorage.removeItem("role");
    window.sessionStorage.removeItem("token");
  } catch {
    /* localStorage may throw in private-browsing modes - ignore. */
  }
}

export function readCachedUser(): AuthUser | null {
  try {
    if (typeof window === "undefined") return null;
    const raw =
      window.localStorage.getItem(USER_CACHE_KEY) ??
      window.sessionStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeAuthUser(parsed as AuthUser);
  } catch {
    return null;
  }
}

export function writeCachedUser(user: AuthUser | null): void {
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalizeAuthUser(user)));
    } else {
      purgeAuthStorage();
    }
  } catch {
    /* localStorage may throw in private-browsing modes - ignore. */
  }
}

/* - State - */

const initialState: AuthState = {
  user: null,
  initialized: false,
  status: "idle",
  error: null,
  accessExpiresAt: null,
  refreshExpiresAt: null,
};

/* - Thunks - */

/**
 * Fired once on app boot to restore identity after a page refresh.
 *
 * Trusts the cached user; does NOT verify the session by hitting /refresh.
 * Verification happens lazily - the first API request that returns 401 makes
 * the http.ts interceptor call /refresh exactly once. If that succeeds, the
 * original request retries. If it fails, the interceptor dispatches clearAuth
 * and the route guard sends the user to /login.
 *
 * Trade-off: a user whose cookies have expired entirely will see a brief flash
 * of the authed UI before their first API call 401s and logs them out. That's
 * preferable to a /refresh on every reload.
 *
 * Switch to `await authService.getCurrentUser()` here once the backend ships
 * GET /auth/me - that endpoint is a cheap session check without rotating tokens.
 */
export const bootstrapAuth = createAsyncThunk<AuthUser | null, void, { state: RootStateShape }>(
  "auth/bootstrap",
  () => authService.getCurrentUser(),
  {
    condition: (_, { getState }) => {
      const { auth } = getState();
      return !auth.initialized && auth.status !== "loading";
    },
  },
);

export const loginUser = createAsyncThunk<LoginResponse, LoginCredentials, { rejectValue: string }>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Couldn't sign you in. Check your credentials and try again."),
      );
    }
  },
);

export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error: unknown) {
      // Even if the server call fails, the reducer below still clears local state.
      return rejectWithValue(extractErrorMessage(error, "Logout request failed."));
    } finally {
      purgeAuthStorage();
    }
  },
);

/* - Slice - */

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Sets the authenticated user and token directly (e.g. from CRM gateway or external SSO) */
    setAuthUser(state, action: PayloadAction<{ user: AuthUser; token?: string; refreshToken?: string }>) {
      state.user = normalizeAuthUser(action.payload.user);
      state.initialized = true;
      state.status = "idle";
      state.error = null;
      if (typeof window !== "undefined") {
        if (action.payload.token) {
          window.localStorage.setItem("hrm_token", action.payload.token);
        }
        if (action.payload.refreshToken) {
          window.localStorage.setItem("hrm_refresh_token", action.payload.refreshToken);
        }
      }
      writeCachedUser(state.user);
    },
    /** Imperatively clear local auth - called by the 401 interceptor. */
    clearAuth(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
      state.initialized = true;
      state.accessExpiresAt = null;
      state.refreshExpiresAt = null;
      purgeAuthStorage();
    },
    clearAuthError(state) {
      state.error = null;
    },
    /** Patch the cached auth user (e.g. after a profile update) and persist it. */
    updateAuthUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = normalizeAuthUser({ ...state.user, ...action.payload });
        writeCachedUser(state.user);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // bootstrap
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action: PayloadAction<AuthUser | null>) => {
        state.user = action.payload ? normalizeAuthUser(action.payload) : null;
        state.initialized = true;
        state.status = "idle";
        state.error = null;
        writeCachedUser(state.user);
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.initialized = true;
        state.status = "idle";
        state.error = null;
        if (!readCachedUser()) {
          purgeAuthStorage();
        }
      })
      // login
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        const now = Date.now();
        state.user = normalizeAuthUser(action.payload.user);
        state.initialized = true;
        state.accessExpiresAt = now + (action.payload.accessExpiresInMs ?? 24 * 60 * 60 * 1000);
        state.refreshExpiresAt = now + (action.payload.refreshExpiresInMs ?? 7 * 24 * 60 * 60 * 1000);
        state.status = "idle";
        state.error = null;
        if (typeof window !== "undefined") {
          if (action.payload.token) {
            window.localStorage.setItem("hrm_token", action.payload.token);
          }
          if (action.payload.refreshToken) {
            window.localStorage.setItem("hrm_refresh_token", action.payload.refreshToken);
          }
        }
        writeCachedUser(state.user);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.user = null;
        state.status = "error";
        state.error = action.payload ?? "Sign-in failed.";
        state.accessExpiresAt = null;
        state.refreshExpiresAt = null;
        purgeAuthStorage();
      })
      // logout
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
        state.accessExpiresAt = null;
        state.refreshExpiresAt = null;
        purgeAuthStorage();
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Clear locally even if the server call failed.
        state.user = null;
        state.status = "idle";
        state.error = action.payload ?? null;
        state.accessExpiresAt = null;
        state.refreshExpiresAt = null;
        purgeAuthStorage();
      });
  },
});

export const { clearAuth, clearAuthError, updateAuthUser, setAuthUser } = authSlice.actions;
export const authReducer = authSlice.reducer;

/* - Selectors - */

interface RootStateShape {
  auth: AuthState;
}

export const selectAuthState = (s: RootStateShape): AuthState => s.auth;
export const selectAuthUser = (s: RootStateShape): AuthUser | null => s.auth.user;
export const selectAuthRole = (s: RootStateShape): Role | null => s.auth.user?.role ?? null;
export const selectIsAuthenticated = (s: RootStateShape): boolean => s.auth.user !== null;
export const selectAuthInitialized = (s: RootStateShape): boolean => s.auth.initialized;
export const selectAuthStatus = (s: RootStateShape): AuthState["status"] => s.auth.status;
export const selectAuthError = (s: RootStateShape): string | null => s.auth.error;
export const selectAccessExpiresAt = (s: RootStateShape): number | null => s.auth.accessExpiresAt;

/* - Helpers - */

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    return body?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
