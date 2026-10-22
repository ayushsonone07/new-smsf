import { apiClient } from './axios'

export interface SmtpConfigDTO {
  id?: number
  username: string
  password?: string
  host: string
  port: number
  fromEmail: string
  fromName: string
  authEnabled: boolean
  starttlsEnabled: boolean
  sslEnabled?: boolean
  active?: boolean
  templateId?: number
  templateName?: string
}

export interface TemplateDTO {
  templateId?: number
  templateName: string
  templateType: 'EMAIL' | 'WHATSAPP' | 'NOTIFICATION' | string
  emailSubject: string
  emailBody: string
  createdAt?: string
}

export interface WebhookConfig {
  id?: string
  name: string
  url: string
  token?: string
  enabled: boolean
  eventTypes: string[]
}

export interface TutorialDTO {
  id?: string | number
  title: string
  description: string
  category?: string
  departmentType: string
  duration?: string
  type?: 'video' | 'article'
  thumbnailUrl?: string
  videoUrl?: string
  tags?: string
  published?: boolean
  publishedAt?: string
}

export interface HrmSmtpConfig {
  host: string
  port: number
  username: string
  password?: string
  fromEmail: string
  fromName: string
  authEnabled: boolean
  starttlsEnabled: boolean
  active?: boolean
}

interface CustomApiResponse<T> {
  status?: string | number
  message?: string
  data?: T
  success?: boolean
}

// ── SMTP ────────────────────────────────────────────────────────────────────────
export async function getSmtpConfigs(): Promise<SmtpConfigDTO[]> {
  try {
    const res = await apiClient.get<CustomApiResponse<SmtpConfigDTO[]> | SmtpConfigDTO[]>('/api/smtp/config/fetch')
    const payload = res.data
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  } catch (err) {
    console.warn('Failed to fetch SMTP configs:', err)
    return []
  }
}

export async function createSmtpConfig(dto: SmtpConfigDTO): Promise<SmtpConfigDTO> {
  const res = await apiClient.post<CustomApiResponse<SmtpConfigDTO>>('/api/smtp/config/create', dto)
  return res.data?.data || dto
}

export async function updateSmtpConfig(dto: SmtpConfigDTO): Promise<SmtpConfigDTO> {
  const res = await apiClient.patch<CustomApiResponse<SmtpConfigDTO>>('/api/smtp/config/update', dto)
  return res.data?.data || dto
}

export async function deleteSmtpConfig(id: number): Promise<void> {
  await apiClient.delete(`/api/smtp/config/delete/${id}`)
}

export async function testSmtpEmail(recipientEmail: string, dto: SmtpConfigDTO): Promise<void> {
  await apiClient.post(`/api/smtp/test?recipientEmail=${encodeURIComponent(recipientEmail)}`, dto)
}

export async function sendFaceEnrollLink(recipientUsername: string, link: string): Promise<void> {
  await apiClient.post(
    `/api/smtp/sendFaceLink?recipientUsername=${encodeURIComponent(recipientUsername)}&link=${encodeURIComponent(link)}`,
  )
}

// ── HRM SMTP ────────────────────────────────────────────────────────────────────
export async function getHrmSmtpConfig(): Promise<HrmSmtpConfig | null> {
  try {
    const res = await apiClient.get<CustomApiResponse<HrmSmtpConfig> | HrmSmtpConfig>('/api/v1/hrm/smtp')
    const payload = res.data
    if (payload && 'data' in payload && payload.data) return payload.data
    if (payload && 'host' in payload) return payload as HrmSmtpConfig
    return null
  } catch {
    return null
  }
}

export async function saveHrmSmtpConfig(dto: HrmSmtpConfig): Promise<void> {
  await apiClient.post('/api/v1/hrm/smtp', dto)
}

export async function testHrmSmtpEmail(toEmail: string): Promise<void> {
  await apiClient.post('/api/v1/hrm/smtp/test', { toEmail })
}

// ── Templates ───────────────────────────────────────────────────────────────────
export async function getTemplates(templateId?: number): Promise<TemplateDTO[]> {
  try {
    const url = templateId ? `/api/smtp/templates/fetch?templateId=${templateId}` : '/api/smtp/templates/fetch'
    const res = await apiClient.get<CustomApiResponse<TemplateDTO[]> | TemplateDTO[]>(url)
    const payload = res.data
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  } catch (err) {
    console.warn('Failed to fetch templates:', err)
    return []
  }
}

export async function createTemplate(dto: TemplateDTO): Promise<TemplateDTO> {
  const res = await apiClient.post<CustomApiResponse<TemplateDTO>>('/api/smtp/template/create', dto)
  return res.data?.data || dto
}

export async function updateTemplate(action: 'edit' | 'delete', dto: Partial<TemplateDTO>): Promise<void> {
  await apiClient.patch(`/api/smtp/template/update?action=${action}`, dto)
}

// ── WhatsApp Flows ──────────────────────────────────────────────────────────────
export async function getWhatsAppConfigs(): Promise<Record<string, string>> {
  try {
    const res = await apiClient.get<CustomApiResponse<Record<string, string>> | Record<string, string>>(
      '/api/config/fetch?configurationType=WHATSAPP_FLOW_IDS',
    )
    const payload = res.data
    if (payload && 'data' in payload && payload.data && typeof payload.data === 'object') {
      return payload.data as Record<string, string>
    }
    if (payload && typeof payload === 'object') return payload as Record<string, string>
    return {}
  } catch (err) {
    console.warn('Failed to fetch WhatsApp configs:', err)
    return {}
  }
}

export async function saveWhatsAppConfigs(configs: Record<string, string>): Promise<void> {
  await apiClient.post('/api/config/create', {
    ...configs,
    configurationType: 'WHATSAPP_FLOW_IDS',
  })
}

// ── Customer Management & Dynamic Service Templates ────────────────────────────
export async function getOnboardingStatus(): Promise<boolean> {
  try {
    const res = await apiClient.get<CustomApiResponse<string | boolean>>('/api/settings/onboarding-status/fetch')
    const val = res.data?.data
    return val === true || val === 'true'
  } catch {
    return false
  }
}

export async function updateOnboardingStatus(onboardingStatus: boolean): Promise<boolean> {
  const res = await apiClient.post<CustomApiResponse<boolean>>('/api/settings/onboarding-status/update', {
    onboardingStatus,
  })
  return res.data?.data ?? onboardingStatus
}

export async function getServiceDataTemplate(): Promise<Record<string, string>> {
  try {
    const res = await apiClient.get<CustomApiResponse<Record<string, string>>>('/api/config/get/service-data-template')
    return res.data?.data || {}
  } catch {
    return {}
  }
}

export async function saveServiceDataTemplate(template: Record<string, string>): Promise<void> {
  await apiClient.put('/api/config/manage/service-data-template', template)
}

// ── Department Config / Completion Email ────────────────────────────────────────
export async function getServiceCompletionMethods(): Promise<Record<string, string>> {
  try {
    const res = await apiClient.get<CustomApiResponse<Record<string, string>>>(
      '/api/config/department/completionMethod',
    )
    return res.data?.data || {}
  } catch {
    return {}
  }
}

export async function updateServiceCompletionMethod(departmentType: string, isSendEmail: boolean): Promise<void> {
  await apiClient.patch('/api/config/service-completion-method', {
    departmentType,
    isSendEmail,
  })
}

// ── Webhooks ────────────────────────────────────────────────────────────────────
export async function getWebhooks(): Promise<WebhookConfig[]> {
  try {
    const res = await apiClient.get<CustomApiResponse<WebhookConfig[]> | WebhookConfig[]>('/api/config/webhooks')
    const payload = res.data
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  } catch {
    return []
  }
}

export async function getWebhookEventTypes(): Promise<string[]> {
  try {
    const res = await apiClient.get<CustomApiResponse<string[]> | string[]>('/api/config/webhooks/event-types')
    const payload = res.data
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return [
      'CUSTOMER_REGISTERED',
      'ONBOARDING_COMPLETED',
      'SERVICE_STATUS_CHANGED',
      'PAYMENT_CONFIRMED',
      'TICKET_CREATED',
      'CALL_COMPLETED',
    ]
  } catch {
    return [
      'CUSTOMER_REGISTERED',
      'ONBOARDING_COMPLETED',
      'SERVICE_STATUS_CHANGED',
      'PAYMENT_CONFIRMED',
      'TICKET_CREATED',
      'CALL_COMPLETED',
    ]
  }
}

export async function createWebhook(webhook: WebhookConfig): Promise<WebhookConfig> {
  const res = await apiClient.post<CustomApiResponse<WebhookConfig>>('/api/config/webhooks', webhook)
  return res.data?.data || webhook
}

export async function updateWebhook(id: string, webhook: WebhookConfig): Promise<WebhookConfig> {
  const res = await apiClient.put<CustomApiResponse<WebhookConfig>>(`/api/config/webhooks/${id}`, webhook)
  return res.data?.data || webhook
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`/api/config/webhooks/${id}`)
}

// ── Tutorials ───────────────────────────────────────────────────────────────────
export async function getTutorials(): Promise<TutorialDTO[]> {
  try {
    const res = await apiClient.get<CustomApiResponse<TutorialDTO[]> | TutorialDTO[]>('/api/tutorials/admin')
    const payload = res.data
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  } catch {
    try {
      const fallback = await apiClient.get<CustomApiResponse<TutorialDTO[]> | TutorialDTO[]>('/api/tutorials')
      const payload = fallback.data
      if (Array.isArray(payload)) return payload
      if (payload && Array.isArray(payload.data)) return payload.data
      return []
    } catch {
      return []
    }
  }
}

export async function createTutorial(dto: TutorialDTO): Promise<TutorialDTO> {
  const res = await apiClient.post<CustomApiResponse<TutorialDTO>>('/api/tutorials', dto)
  return res.data?.data || dto
}

export async function deleteTutorial(id: string | number): Promise<void> {
  await apiClient.delete(`/api/tutorials/${id}`)
}

// ── Security ────────────────────────────────────────────────────────────────────
export async function resetSuperAdminPassword(): Promise<void> {
  await apiClient.post('/api/auth/admin/reset-admin-password', {})
}
