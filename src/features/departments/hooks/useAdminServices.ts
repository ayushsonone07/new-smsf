import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addAdminService,
  getAdminServices,
  manageAdminService,
  type AddAdminServicePayload,
  type AdminServiceItem,
  type ManageAdminServicePayload,
} from '../../../api/admin-services.api'

export const ADMIN_SERVICES_QUERY_KEY = ['admin-services'] as const

export function useAdminServices() {
  return useQuery({
    queryKey: ADMIN_SERVICES_QUERY_KEY,
    queryFn: getAdminServices,
    staleTime: 60 * 1000,
  })
}

export function useAddAdminService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddAdminServicePayload) => addAdminService(payload),
    onSuccess: (createdService) => {
      if (createdService) {
        queryClient.setQueryData<AdminServiceItem[]>(
          ADMIN_SERVICES_QUERY_KEY,
          (prev = []) => {
            const exists = prev.some(
              (item) =>
                item.id === createdService.id ||
                (item.serviceType === createdService.serviceType &&
                  item.departmentType === createdService.departmentType),
            )
            return exists ? prev : [createdService, ...prev]
          },
        )
      }
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permission-departments'],
      })
    },
  })
}

export function useManageAdminService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ManageAdminServicePayload) =>
      manageAdminService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permission-departments'],
      })
    },
  })
}

