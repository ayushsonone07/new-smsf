import { authedApiRequest } from './client'

export interface ScheduledBulkEmailJob {
  id: string
  subject: string
  recipientsCount: number
  skippedInvalidCount: number
  skippedDuplicateCount: number
  scheduledAt: string
  status: 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
}

export interface ScheduledBroadcastCreateResult {
  recipientsCount: number
  skippedInvalidCount: number
  skippedDuplicateCount: number
  schedules: ScheduledBulkEmailJob[]
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface ScheduledBulkEmailUnlock {
  unlockToken: string
  expiresInSeconds: number
}

export async function requestScheduledBulkEmailOtp() {
  return authedApiRequest<ApiResponse<null>>(
    '/api/auth/admin/scheduled-broadcast/unlock/request',
    { method: 'POST' },
  )
}

export async function verifyScheduledBulkEmailOtp(otp: string) {
  return authedApiRequest<ApiResponse<ScheduledBulkEmailUnlock>>(
    '/api/auth/admin/scheduled-broadcast/unlock/verify',
    {
      method: 'POST',
      body: JSON.stringify({ otp }),
    },
  )
}

export async function createScheduledBulkEmail(formData: FormData, unlockToken: string) {
  return authedApiRequest<ApiResponse<ScheduledBroadcastCreateResult>>(
    '/api/auth/admin/scheduled-broadcast',
    {
      method: 'POST',
      body: formData,
      headers: { 'X-Bulk-Email-Unlock-Token': unlockToken },
    },
  )
}
