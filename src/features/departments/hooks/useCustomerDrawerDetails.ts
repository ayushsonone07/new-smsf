import { useQuery } from '@tanstack/react-query'
import {
  getCustomerProfileDetails,
  getCustomerRemarks,
  getCustomerInternalRemarks,
  getCustomerReviewReplies,
  getCustomerServiceRows,
} from '../../../api/customer-drawer.api'
import type { CustomerDrawerApiDetails } from '../../../api/customer-drawer.api'
import type { OnboardingCustomer } from '../../../components/head/customers-list/CustomersList'
import { getSession } from '../../../app/auth/session'

export function useCustomerDrawerDetails(
  customer: OnboardingCustomer | null,
  options: {
    profileOnly?: boolean
    departmentType?: string
    requestUsername?: string
  } = {},
): CustomerDrawerApiDetails {
  const profileOnly = options.profileOnly ?? false
  const session = getSession()
  const rawDept = session?.user.departmentType || ''
  const isGoogle =
    rawDept.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/google-head'))
  const customerDepartment = options.departmentType !== undefined
    ? options.departmentType
    : isGoogle
      ? 'GOOGLE_DEPARTMENT'
      : (rawDept || 'ONBOARDING_DEPARTMENT')

  const customerId = Number(customer?.id)
  const hasCustomerId = Number.isInteger(customerId) && customerId > 0
  const contact = customer?.phone.trim() ?? ''
  const isOpen = customer !== null

  const profileQuery = useQuery({
    queryKey: ['customer-drawer-profile', contact],
    queryFn: () => getCustomerProfileDetails(contact),
    enabled: isOpen && contact.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const reviewRepliesQuery = useQuery({
    queryKey: ['customer-drawer-review-replies', customerId, customerDepartment],
    queryFn: () => getCustomerReviewReplies(customerId, customerDepartment),
    enabled:
      isOpen &&
      hasCustomerId &&
      !profileOnly &&
      customerDepartment.length > 0,
    staleTime: 0,
  })

  const remarksQuery = useQuery({
    queryKey: ['customer-drawer-remarks', customerId, customerDepartment, options.requestUsername],
    queryFn: () => getCustomerRemarks(customerId, customerDepartment, options.requestUsername),
    enabled: isOpen && hasCustomerId && !profileOnly,
    staleTime: 0,
  })

  const internalRemarksQuery = useQuery({
    queryKey: ['customer-drawer-internal-remarks', customerId, customerDepartment, options.requestUsername],
    queryFn: () => getCustomerInternalRemarks(customerId, customerDepartment, options.requestUsername),
    enabled: isOpen && hasCustomerId && !profileOnly,
    staleTime: 0,
  })

  const rowsQuery = useQuery({
    queryKey: ['customer-drawer-rows', contact, options.requestUsername],
    queryFn: () => getCustomerServiceRows(contact, options.requestUsername),
    enabled: isOpen && contact.length > 0 && !profileOnly,
    staleTime: 0,
  })

  return {
    profile: profileQuery.data,
    serviceRows: rowsQuery.data ?? [],
    serviceRowsLoading: rowsQuery.isLoading,
    remarks: remarksQuery.data,
    internalRemarks: internalRemarksQuery.data ?? [],
    reviewReplies: reviewRepliesQuery.data ?? [],
    isLoading:
      profileQuery.isLoading ||
      reviewRepliesQuery.isLoading ||
      remarksQuery.isLoading ||
      internalRemarksQuery.isLoading ||
      rowsQuery.isLoading,
    errors: [
      profileQuery.error,
      reviewRepliesQuery.error,
      remarksQuery.error,
      internalRemarksQuery.error,
      rowsQuery.error,
    ]
      .filter((error): error is Error => error instanceof Error)
      .map((error) => error.message)
      .concat(
        isOpen && !contact
          ? ['Customer contact number is unavailable; contact-based details were not requested.']
          : [],
        isOpen && !hasCustomerId && !profileOnly
          ? ['Customer ID is unavailable; remarks and review replies were not requested.']
          : [],
      ),
  }
}
