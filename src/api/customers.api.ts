import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import { updateOnboardingStatus } from './department-users.api'
import {
  delay,
  customers,
  nextCustomerId,
} from './mock/db'
import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '../features/departments/types/customer.types'

export async function getCustomers(
  departmentId: string,
): Promise<Customer[]> {
  await delay()

  return structuredClone(
    customers.filter(
      (customer) =>
        customer.departmentId === departmentId,
    ),
  )
}

export async function createCustomer(
  departmentId: string,
  data: CreateCustomerRequest,
): Promise<Customer> {
  await delay()

  const customer: Customer = {
    id: nextCustomerId(),
    departmentId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    onboardingStatus: 'pending',
    callStatus: 'connected',
    assigneeId: null,
    remark: '',
    updatedLabel: 'Just now',
  }

  customers.push(customer)

  return structuredClone(customer)
}

export async function updateCustomer(
  id: string,
  data: UpdateCustomerRequest,
): Promise<any> {
  const session = getSession()
  const customer = customers.find((c) => c.id === id)

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
      remarkType: data.remarkType || 'INTERNAL',
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
      try {
        const oldStatusStr = (customer?.onboardingStatus || customer?.status || '').toUpperCase().replace(/-/g, '_')
        const statusPayload = {
          customerId: id,
          newStatus: newStatusStr,
          username,
          departmentType,
          oldStatus: oldStatusStr
        }
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

  if (customer) {
    Object.assign(customer, data)
    return structuredClone(customer)
  }

  return { id, ...data }
}

export async function deleteCustomer(
  id: string,
): Promise<void> {
  await delay()

  const index = customers.findIndex(
    (item) => item.id === id,
  )

  if (index === -1) {
    throw new Error('Customer not found')
  }

  customers.splice(index, 1)
}
