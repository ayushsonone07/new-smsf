import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDynamicColumn,
  createDynamicRoute,
  getDepartmentDetails,
  getDepartmentTypes,
  getDynamicColumns,
  getDynamicRoutes,
  getUserDynamicPermissions,
  updateColumnPermission,
  updateColumnStatus,
  updateRouteStatus,
  type CreateDynamicColumnPayload,
  type CreateDynamicRoutePayload,
  type UpdateColumnPermissionPayload,
  type UpdateColumnStatusPayload,
  type UpdateRouteStatusPayload,
} from '../../../api/dynamic-permission.api'

export function useDepartmentTypes() {
  return useQuery({
    queryKey: ['dynamic-permissions', 'departments'],
    queryFn: getDepartmentTypes,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useDynamicRoutes(departmentType?: string) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'routes', departmentType],
    queryFn: () => getDynamicRoutes(departmentType),
    enabled: Boolean(departmentType),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useDynamicColumns(departmentType?: string) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'columns', departmentType],
    queryFn: () => getDynamicColumns(departmentType),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useDepartmentDetails(departmentType: string) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'department-details', departmentType],
    queryFn: () => getDepartmentDetails(departmentType),
    enabled: Boolean(departmentType && departmentType !== 'ALL'),
  })
}

export function useUserDynamicPermissions(params?: {
  username?: string
  departmentType?: string
}) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'user-permissions', params?.username, params?.departmentType],
    queryFn: () => getUserDynamicPermissions(params),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateDynamicRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDynamicRoutePayload) =>
      createDynamicRoute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes'],
      })
    },
  })
}

export function useCreateDynamicColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDynamicColumnPayload) =>
      createDynamicColumn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
    },
  })
}

export function useUpdateColumnPermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateColumnPermissionPayload) =>
      updateColumnPermission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
    },
  })
}

export function useUpdateColumnStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateColumnStatusPayload) =>
      updateColumnStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
    },
  })
}

export function useUpdateRouteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateRouteStatusPayload) =>
      updateRouteStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes'],
      })
    },
  })
}


