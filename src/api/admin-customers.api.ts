import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'

export interface AdminCustomer {
  id?: string | number
  username?: string
  name?: string
  customerName?: string
  fullName?: string
  contactName?: string
  contactPersonName?: string
  clientName?: string
  leadName?: string
  ownerName?: string
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  phone?: string
  contact?: string
  businessName?: string
  companyName?: string
  business?: string
  status?: string
  role?: string
  createdAt?: string
  [key: string]: unknown
}

export interface AdminCustomersPage {
  data: AdminCustomer[]
  totalElements: number
  totalPage: number
  pageNumber: number
  elementSize: number
}

type PageLike = {
  data?: unknown
  content?: unknown
  customers?: unknown
  totalElements?: number
  totalPage?: number
  totalPages?: number
  pageNumber?: number
  number?: number
  elementSize?: number
  size?: number
}

export async function getAdminCustomers(
  page = 0,
  size = 10,
): Promise<AdminCustomersPage> {
  const session = getSession()
  const adminUsername =
    session?.user.email ||
    session?.user.username ||
    session?.user.name ||
    ''

  const response = await authedApiRequest<PageLike>(
    `/api/auth/admin/customers?page=${page}&size=${size}`,
    {
      headers: {
        adminUsername,
      },
    },
  )

  const nested = response?.data && !Array.isArray(response.data)
    ? response.data as PageLike
    : response
  const itemsSource = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(nested?.data)
      ? nested.data
      : Array.isArray(nested?.content)
        ? nested.content
        : Array.isArray(nested?.customers)
          ? nested.customers
          : []
  const items = itemsSource as AdminCustomer[]

  return {
    data: items,
    totalElements: nested?.totalElements ?? response?.totalElements ?? items.length,
    totalPage: nested?.totalPage ?? nested?.totalPages ?? response?.totalPage ?? response?.totalPages ?? 1,
    pageNumber: nested?.pageNumber ?? nested?.number ?? response?.pageNumber ?? response?.number ?? page,
    elementSize: nested?.elementSize ?? nested?.size ?? response?.elementSize ?? response?.size ?? size,
  }
}
