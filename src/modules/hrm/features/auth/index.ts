// Public API for the `auth` feature.
// External code MUST import from this file only — anything not re-exported here is private.

export { LoginPage } from "./components/LoginPage";
export { SetPasswordPage } from "./components/SetPasswordPage";
export { ResetPasswordPage } from "./components/ResetPasswordPage";

export {
  authReducer,
  bootstrapAuth,
  loginUser,
  logoutUser,
  clearAuth,
  clearAuthError,
  updateAuthUser,
  setAuthUser,
  purgeAuthStorage,
  readCachedUser,
  parseJwtPayload,
  USER_CACHE_KEY,
  selectAuthState,
  selectAuthUser,
  selectAuthRole,
  selectIsAuthenticated,
  selectAuthInitialized,
  selectAuthStatus,
  selectAuthError,
  selectAccessExpiresAt,
} from "./store";

export { useAuth, usePasswordReset, useRole, useMyProfile, useUpdateMyProfile } from "./hooks";

export { AUTH_ENDPOINTS } from "./services";

export { isRole } from "./types";
export type {
  Role,
  AuthUser,
  EmployeeProfile,
  UpdateProfileInput,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ForgotPasswordResult,
  LoginCredentials,
  LoginResponse,
  ResetPasswordRequest,
  AuthState,
} from "./types";
