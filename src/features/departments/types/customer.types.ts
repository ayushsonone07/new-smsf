export type CustomerStatus = 'ACTIVE' | 'INACTIVE'

export type CustomerOnboardingStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'

export type CustomerCallStatus = 'connected' | 'not-answered'

export type CustomerBusinessRelationType = 'main' | 'branch'

export interface Customer {
  id: string
  departmentId: string
  name: string
  email: string
  phone: string
  company: string
  status: CustomerStatus
  createdAt: string
  onboardingStatus?: CustomerOnboardingStatus
  callStatus?: CustomerCallStatus
  assigneeId?: string | null
  remark?: string
  updatedLabel?: string
  contactDate?: string
  businessRelationType?: CustomerBusinessRelationType
  businessCount?: number
  businessIndex?: number
  duplicateCount?: number
}

export interface CreateCustomerRequest {
  name: string
  email: string
  phone: string
  company: string
}

export interface UpdateCustomerRequest {
  name?: string
  email?: string
  phone?: string
  company?: string
  onboardingStatus?: CustomerOnboardingStatus
  callStatus?: CustomerCallStatus
  assigneeId?: string | null
  remark?: string
  updatedLabel?: string
  contactDate?: string
  businessRelationType?: CustomerBusinessRelationType
  businessCount?: number
  businessIndex?: number
  duplicateCount?: number
}
