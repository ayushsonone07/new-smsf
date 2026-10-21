import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import { updateOnboardingStatus } from './department-users.api'
import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '../features/departments/types/customer.types'

export async function getCustomers(
  departmentId: string,
): Promise<Customer[]> {
  void departmentId
  return []
}

export async function createCustomer(
  departmentId: string,
  data: CreateCustomerRequest,
): Promise<Customer> {
  void departmentId
  void data
  throw new Error('Creating customers is not supported by the backend.')
}

export async function updateCustomer(
  id: string,
  data: UpdateCustomerRequest,
): Promise<any> {
  const session = getSession()
  const departmentType = session?.user?.departmentType || 'ONBOARDING_DEPARTMENT'
  const username = session?.user?.email || session?.user?.username || ''

  // Remark Update
  if (data.remark !== undefined) {
    const remarkPayload = {
      customerId: id,
      action: 'EDIT',
      departmentType,
      username,
      remark: data.remark,
    }
    await authedApiRequest<any>('/api/auth/customers/manage', {
      method: 'POST',
      body: JSON.stringify(remarkPayload)
    })
  }

  // Status Update
  const rawStatus = data.onboardingStatus ?? data.status
  if (rawStatus !== undefined) {
    const newStatusStr = rawStatus.toUpperCase().replace(/-/g, '_')

    try {
      await updateOnboardingStatus(id, newStatusStr)
    } catch (e) {
      console.error('Failed to update status via /api/auth/onboarding/update:', e)
      const statusPayload = {
        customerId: id,
        newStatus: newStatusStr,
        username,
        departmentType,
        oldStatus: '',
      }
      try {
        await authedApiRequest<any>('/api/auth/update/service', {
          method: 'POST',
          body: JSON.stringify(statusPayload)
        })
      } catch (serviceErr) {
        console.error('Failed to update status via /api/auth/update/service:', serviceErr)
        throw e
      }
    }
  }

  // Assignee Update
  if (data.assigneeId !== undefined) {
    const assignPayload = {
      customerId: id,
      departmentUserId: data.assigneeId,
      departmentType
    }

    await authedApiRequest<any>('/api/auth/customer-service/assign-user', {
      method: 'POST',
      body: JSON.stringify(assignPayload)
    })
  }

  return { id, ...data }
}

export async function deleteCustomer(
  id: string,
): Promise<void> {
  void id
  throw new Error('Deleting customers is not supported by the backend.')
}
