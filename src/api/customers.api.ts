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
): Promise<Customer> {
  await delay()

  const customer = customers.find(
    (item) => item.id === id,
  )

  if (!customer) {
    throw new Error('Customer not found')
  }

  Object.assign(customer, data)

  return structuredClone(customer)
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
