import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'

interface RoundRobinStatusResponse {
  success?: boolean
  message?: string
  data?: boolean
}

function roundRobinUsername(): string {
  const session = getSession()
  return session?.user?.email || session?.user?.username || ''
}

/**
 * `GET /api/round-robin/department?departmentType=X`
 * Returns whether automatic round-robin customer
 * distribution is enabled for the department.
 * Mirrors SMSF's roundRobinSlice.fetchRoundRobinStatus.
 */
export async function getRoundRobinStatus(
  departmentType: string,
): Promise<boolean> {
  const search = new URLSearchParams({ departmentType })
  const res = await authedApiRequest<RoundRobinStatusResponse>(
    `/api/round-robin/department?${search.toString()}`,
    {
      headers: {
        username: roundRobinUsername(),
      },
    },
  )

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to fetch round robin status')
  }

  return res?.data ?? false
}

/**
 * `PUT /api/round-robin/department?departmentType=X&enabled=true`
 * Enables / disables automatic round-robin distribution.
 * Mirrors SMSF's roundRobinSlice.updateRoundRobinStatus.
 */
export async function updateRoundRobinStatus(
  departmentType: string,
  enabled: boolean,
): Promise<boolean> {
  const search = new URLSearchParams({
    departmentType,
    enabled: String(enabled),
  })
  const res = await authedApiRequest<RoundRobinStatusResponse>(
    `/api/round-robin/department?${search.toString()}`,
    {
      method: 'PUT',
      headers: {
        username: roundRobinUsername(),
      },
    },
  )

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update round robin status')
  }

  return res?.data ?? enabled
}
