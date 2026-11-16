import { useNotifications } from './useNotifications'

/** Admin and department layouts share one notification query implementation. */
export function useSuperAdminNotifications() {
  return useNotifications()
}
