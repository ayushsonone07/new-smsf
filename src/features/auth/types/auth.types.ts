export type UserRole = 'ADMIN' | 'HEAD' | 'USER' | 'CUSTOMER'

export interface AuthUser {
  id: string
  name: string
  email: string
  /** Exact backend login identity/JWT subject used by the `username` header. */
  username?: string
  role: UserRole
  /** Department this HEAD / USER belongs to. */
  departmentId?: string
  /**
   * Backend department enum, e.g. `ONBOARDING_DEPARTMENT`
   * (login response `departmentType`). Used as the
   * `department` query param of the onboarding APIs.
   */
  departmentType?: string
}

export interface AuthSession {
  token: string
  user: AuthUser
  issuedAt: string
}

export interface IssuedLoginToken {
  token: string
  user: AuthUser
  issuedBy: string
  createdAt: string
  revoked: boolean
}
