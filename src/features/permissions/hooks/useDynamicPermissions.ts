import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDynamicColumn,
  createDynamicDepartmentType,
  createDynamicRoute,
  createColumnsForRoute,
  getColumnsByRoute,
  getMaxColumnsForRoute,
  getRoutesColumnsSummary,
  getDepartmentDetails,
  getDepartmentTypes,
  getDynamicColumns,
  getDynamicRoutes,
  getUserDynamicPermissions,
  updateColumnPermission,
  updateColumnStatus,
  updateRouteStatus,
  updateDynamicRoute,
  deleteDynamicRoute,
  updateDynamicColumn,
  deleteDynamicColumn,
  type CreateDynamicColumnPayload,
  type CreateDynamicRoutePayload,
  type CreateRouteColumnsPayload,
  type UpdateColumnPermissionPayload,
  type UpdateColumnStatusPayload,
  type UpdateRouteStatusPayload,
  type UpdateDynamicRoutePayload,
  type UpdateDynamicColumnPayload,
} from '../../../api/dynamic-permission.api'

export function useDepartmentTypes(enabled = true) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'departments'],
    queryFn: getDepartmentTypes,
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateDynamicDepartmentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (departmentType: string) =>
      createDynamicDepartmentType(departmentType),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'departments'],
      })
    },
  })
}

export function useDynamicRoutes(departmentType?: string, enabled = true) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'routes', departmentType],
    queryFn: () => getDynamicRoutes(departmentType),
    enabled: enabled && Boolean(departmentType),
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

export function useColumnsByRoute(routeId?: string, departmentType?: string) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'route-columns', routeId, departmentType],
    queryFn: () => getColumnsByRoute(routeId!, departmentType),
    enabled: Boolean(routeId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useMaxColumnsForRoute(routeId?: string, departmentType?: string) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'route-max-columns', routeId, departmentType],
    queryFn: () => getMaxColumnsForRoute(routeId!, departmentType),
    enabled: Boolean(routeId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useRoutesColumnsSummary(departmentType?: string) {
  return useQuery({
    queryKey: ['dynamic-permissions', 'routes-columns-summary', departmentType],
    queryFn: () => getRoutesColumnsSummary(departmentType),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateColumnsForRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRouteColumnsPayload) =>
      createColumnsForRoute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'route-columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'route-max-columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes-columns-summary'],
      })
    },
  })
}

export function useUpdateDynamicRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      routeId,
      payload,
    }: {
      routeId: string
      payload: UpdateDynamicRoutePayload
    }) => updateDynamicRoute(routeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes-columns-summary'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
    },
  })
}

export function useDeleteDynamicRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (routeId: string) => deleteDynamicRoute(routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes-columns-summary'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
    },
  })
}

export function useUpdateDynamicColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      columnId,
      payload,
    }: {
      columnId: string
      payload: UpdateDynamicColumnPayload
    }) => updateDynamicColumn(columnId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'route-columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes-columns-summary'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'route-max-columns'],
      })
    },
  })
}

export function useDeleteDynamicColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (columnId: string) => deleteDynamicColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'route-columns'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'routes-columns-summary'],
      })
      queryClient.invalidateQueries({
        queryKey: ['dynamic-permissions', 'route-max-columns'],
      })
    },
  })
}




