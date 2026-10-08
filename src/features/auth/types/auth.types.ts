export type UserRole = 'ADMIN' | 'HEAD' | 'USER'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  /** Department this HEAD / USER belongs to. */
  departmentId?: string
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
