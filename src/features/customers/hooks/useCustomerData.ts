import { useMemo, useState } from 'react'
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../../../features/departments/types/customer.types'

const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    departmentId: 'dept-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+1 555 0101',
    company: 'Northwind Traders',
    status: 'ACTIVE',
    createdAt: '2026-01-15T09:15:00.000Z',
    onboardingStatus: 'in-progress',
    callStatus: 'connected',
    assigneeId: 'u-1',
    remark: '',
    updatedLabel: 'Just now',
  },
  {
    id: 'cust-2',
    departmentId: 'dept-1',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+1 555 0102',
    company: 'Acme Corp',
    status: 'ACTIVE',
    createdAt: '2026-01-22T14:40:00.000Z',
    onboardingStatus: 'pending',
    callStatus: 'not-answered',
    assigneeId: 'u-2',
    remark: 'Needs follow up',
    updatedLabel: '2h ago',
  },
  {
    id: 'cust-3',
    departmentId: 'dept-1',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+1 555 0103',
    company: 'Globex',
    status: 'INACTIVE',
    createdAt: '2026-02-03T11:05:00.000Z',
    onboardingStatus: 'completed',
    callStatus: 'connected',
    assigneeId: null,
    remark: '',
    updatedLabel: '1d ago',
  },
  {
    id: 'cust-4',
    departmentId: 'dept-1',
    name: 'Sneha Gupta',
    email: 'sneha.gupta@example.com',
    phone: '+1 555 0104',
    company: 'Initech',
    status: 'ACTIVE',
    createdAt: '2026-02-18T16:25:00.000Z',
    onboardingStatus: 'pending',
    callStatus: 'not-answered',
    assigneeId: 'u-3',
    remark: 'Waiting for documents',
    updatedLabel: '3h ago',
  },
  {
    id: 'cust-5',
    departmentId: 'dept-1',
    name: 'Karan Mehta',
    email: 'karan.mehta@example.com',
    phone: '+1 555 0105',
    company: 'Umbrella',
    status: 'ACTIVE',
    createdAt: '2026-03-01T10:50:00.000Z',
    onboardingStatus: 'in-progress',
    callStatus: 'connected',
    assigneeId: 'u-4',
    remark: '',
    updatedLabel: 'Just now',
  },
]

export function useCustomerData() {
  const [customers, setCustomers] = useState<Customer[]>(SAMPLE_CUSTOMERS)

  const allCustomers = useMemo(() => customers, [customers])

  const createCustomer = (data: CreateCustomerRequest) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      departmentId: 'dept-1',
      ...data,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      onboardingStatus: 'pending',
      callStatus: 'connected',
      assigneeId: null,
      remark: '',
      updatedLabel: 'Just now',
    }
    setCustomers((prev) => [...prev, newCustomer])
    return newCustomer
  }

  const updateCustomer = (id: string, data: UpdateCustomerRequest) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    customers: allCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}