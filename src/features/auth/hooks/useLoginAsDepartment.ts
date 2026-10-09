import { useMutation } from '@tanstack/react-query'
import { generateDepartmentSession } from '../../../api/auth.api'
import type { AuthSession } from '../types/auth.types'

/** Admin -> department: email in, department session out. */
export function useLoginAsDepartment() {
  return useMutation({
    mutationFn: (email: string): Promise<AuthSession> =>
      generateDepartmentSession(email),
  })
}
