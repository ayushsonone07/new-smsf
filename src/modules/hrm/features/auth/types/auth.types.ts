/**
 * Auth domain types - match the backend's /api/v1/auth/* contract.
 */

/** Roles used internally by the frontend permission system. */
export type Role = "ADMIN" | "HR" | "HR_HEAD" | "SUB_HR" | "MANAGER" | "EMPLOYEE";

const ALL_ROLES: readonly Role[] = ["ADMIN", "HR", "HR_HEAD", "SUB_HR", "MANAGER", "EMPLOYEE"];

export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/-/g, "_") as Role;
  return ALL_ROLES.includes(normalized) ? normalized : null;
}

export function isRole(value: unknown): value is Role {
  return normalizeRole(value) !== null;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** Frontend-only flag; backend doesn't currently use it. */
  remember?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  resetToken: string;
  expiresInMinutes: number;
}

export interface ForgotPasswordResult {
  message: string;
  data: ForgotPasswordResponse | null;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  password: string;
}

/** Shape of `data` in the /auth/login response. */
export interface LoginResponse {
  user: AuthUser;
  token?: string;
  refreshToken?: string;
  tokenType?: string;
  accessExpiresInMs?: number;
  refreshExpiresInMs?: number;
}

export function normalizeAuthUser(user: AuthUser): AuthUser {
  return { ...user, role: normalizeRole(user.role) ?? user.role };
}

/**
 * Employee profile returned by GET/PATCH /api/v1/auth/profile (EmployeeListItem).
 * Field names mirror the backend DTO exactly.
 */
export interface EmployeeProfile {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  joiningDate: string | null;
  exitDate: string | null;
  employmentType: string | null;
  status: string;
  onboardingStatus: string;
  departmentId: number | null;
  departmentName: string | null;
  designationId: number | null;
  designationName: string | null;
  managerId: number | null;
  managerName: string | null;
  candidateId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Body accepted by PATCH /api/v1/auth/profile. */
export interface UpdateProfileInput {
  name: string;
  email: string;
  phone?: string;
}

export function normalizeLoginResponse(raw: any): LoginResponse {
  if (!raw) {
    throw new Error("Empty response received from authentication server");
  }

  // Handle nested data if present (e.g. from ApiEnvelope or axios response.data)
  const payload = raw.data && typeof raw.data === "object" ? raw.data : raw;

  // Extract token and refresh token from any possible location
  const token =
    payload.token ||
    payload.accessToken ||
    payload.access_token ||
    raw.token ||
    raw.accessToken ||
    raw.access_token ||
    "";

  const refreshToken =
    payload.refreshToken ||
    payload.refresh_token ||
    payload.data?.refreshToken ||
    payload.data?.refresh_token ||
    raw.refreshToken ||
    raw.refresh_token ||
    "";

  // Extract user object or build from flat fields
  const userPayload =
    payload.user && typeof payload.user === "object"
      ? payload.user
      : raw.user && typeof raw.user === "object"
      ? raw.user
      : payload;

  const user = normalizeAuthUser(userPayload);

  // If role was on the payload root instead of userPayload
  if ((!user.role || user.role === "EMPLOYEE") && (payload.role || raw.role)) {
    user.role = normalizeRole(payload.role || raw.role) ?? user.role;
  }

  // Save tokens to localStorage for subsequent API calls
  if (token && typeof window !== "undefined") {
    localStorage.setItem("hrm_token", token);
  }
  if (refreshToken && typeof window !== "undefined") {
    localStorage.setItem("hrm_refresh_token", refreshToken);
  }

  // Also cache user in localStorage
  if (typeof window !== "undefined" && (user.id || user.email)) {
    localStorage.setItem("mbg.auth.user", JSON.stringify(user));
  }

  return {
    user,
    token,
    refreshToken: refreshToken || undefined,
    tokenType: payload.tokenType || raw.tokenType || "Bearer",
    accessExpiresInMs: payload.accessExpiresInMs || 24 * 60 * 60 * 1000,
    refreshExpiresInMs: payload.refreshExpiresInMs || 7 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Local auth state.
 * - `initialized` separates first-load bootstrap from subsequent activity.
 * - `accessExpiresAt` is a wall-clock timestamp (ms) so a UI timer can warn
 *   the user before silent refresh - purely UX, not security.
 */
export interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  status: "idle" | "loading" | "error";
  error: string | null;
  accessExpiresAt: number | null;
  refreshExpiresAt: number | null;
}
