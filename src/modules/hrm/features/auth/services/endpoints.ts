/**
 * Auth endpoint URLs.
 * Update only this file if the backend renames a path.
 */
export const AUTH_ENDPOINTS = {
  /** Implemented. POST { email, password } → sets ACCESS_TOKEN + REFRESH_TOKEN cookies, returns user. */
  login: "/api/v1/auth/login",

  /** Implemented. POST → backend reads REFRESH_TOKEN cookie, rotates both cookies. */
  refresh: "/api/v1/auth/refresh",

  /** Implemented. GET → returns the current user from the cookie. Used on page refresh. */
  me: "/api/v1/auth/me",

  /** Implemented. GET/PATCH → fetch/update the authenticated user's own employee profile. */
  profile: "/api/v1/auth/profile",

  /** Implemented. POST → clears both cookies server-side. */
  logout: "/api/v1/auth/logout",

  /** Implemented. PATCH ?token=… with { password } → activates account once onboarding is done. */
  setPassword: "/api/v1/auth/set-password",

  /** Implemented. POST { email } → generic response, with a token only in development. */
  forgotPassword: "/api/v1/auth/forgot-password",

  /** Implemented. PATCH ?token=… with { password } → resets an active user's password. */
  resetPassword: "/api/v1/auth/reset-password",
} as const;
