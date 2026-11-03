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

export async function createScheduledBulkEmail(formData: FormData) {
  return authedApiRequest<ApiResponse<ScheduledBroadcastCreateResult>>(
    '/api/auth/admin/scheduled-broadcast',
    {
      method: 'POST',
      body: formData,
    },
  )
}
