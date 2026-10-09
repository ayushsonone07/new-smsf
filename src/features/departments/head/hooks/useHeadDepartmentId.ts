import { getSession } from '../../../../app/auth/session'

/** Department the signed-in head belongs to (admin previews dept-1). */
export function useHeadDepartmentId(): string {
  const session = getSession()
  return session?.user.departmentId ?? 'dept-1'
}
