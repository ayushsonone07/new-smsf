import { useQuery } from '@tanstack/react-query'
import {
  getCustomerProfileDetails,
  getCustomerRemarks,
  getCustomerReviewReplies,
  getCustomerServiceRows,
} from '../../../api/customer-drawer.api'
import type { CustomerDrawerApiDetails } from '../../../api/customer-drawer.api'
import type { OnboardingCustomer } from '../../../components/head/customers-list/CustomersList'

const CUSTOMER_DEPARTMENT = 'ONBOARDING_DEPARTMENT'

export function useCustomerDrawerDetails(
  customer: OnboardingCustomer | null,
): CustomerDrawerApiDetails {
  const customerId = Number(customer?.id)
  const hasCustomerId = Number.isInteger(customerId) && customerId > 0
  const contact = customer?.phone.trim() ?? ''
  const isOpen = customer !== null

  const profileQuery = useQuery({
    queryKey: ['customer-drawer-profile', contact],
    queryFn: () => getCustomerProfileDetails(contact),
    enabled: isOpen && contact.length > 0,
    staleTime: 0,
  })

  const reviewRepliesQuery = useQuery({
    queryKey: ['customer-drawer-review-replies', customerId, CUSTOMER_DEPARTMENT],
    queryFn: () => getCustomerReviewReplies(customerId, CUSTOMER_DEPARTMENT),
    enabled: isOpen && hasCustomerId,
    staleTime: 0,
  })

  const remarksQuery = useQuery({
    queryKey: ['customer-drawer-remarks', customerId, CUSTOMER_DEPARTMENT],
    queryFn: () => getCustomerRemarks(customerId, CUSTOMER_DEPARTMENT),
    enabled: isOpen && hasCustomerId,
    staleTime: 0,
  })

  const rowsQuery = useQuery({
    queryKey: ['customer-drawer-rows', contact],
    queryFn: () => getCustomerServiceRows(contact),
    enabled: isOpen && contact.length > 0,
    staleTime: 0,
  })

  return {
    profile: profileQuery.data,
    serviceRows: rowsQuery.data ?? [],
    serviceRowsLoading: rowsQuery.isLoading,
    remarks: remarksQuery.data,
    reviewReplies: reviewRepliesQuery.data ?? [],
    isLoading:
      profileQuery.isLoading ||
      reviewRepliesQuery.isLoading ||
      remarksQuery.isLoading ||
      rowsQuery.isLoading,
    errors: [
      profileQuery.error,
      reviewRepliesQuery.error,
      remarksQuery.error,
      rowsQuery.error,
    ]
      .filter((error): error is Error => error instanceof Error)
      .map((error) => error.message)
      .concat(
        isOpen && !contact
          ? ['Customer contact number is unavailable; contact-based details were not requested.']
          : [],
        isOpen && !hasCustomerId
          ? ['Customer ID is unavailable; remarks and review replies were not requested.']
          : [],
      ),
  }
}
