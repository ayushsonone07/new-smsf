export type CustomerStatus = 'ACTIVE' | 'INACTIVE'

export interface Customer {
  id: string
  departmentId: string
  name: string
  email: string
  phone: string
  company: string
  status: CustomerStatus
  createdAt: string
}

export interface CreateCustomerRequest {
  name: string
  email: string
  phone: string
  company: string
}

export interface UpdateCustomerRequest {
  name: string
  email: string
  phone: string
  company: string
}
