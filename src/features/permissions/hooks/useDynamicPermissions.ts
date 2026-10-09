import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDynamicColumn,
  createDynamicRoute,
  getDepartmentTypes,
  getDynamicColumns,
  getDynamicRoutes,
  type CreateDynamicColumnPayload,
  type CreateDynamicRoutePayload,
} from '../../../api/dynamic-permission.api'

export function useDepartmentTypes() {
  return useQuery({
    queryKey: ['dynamic-permissions', 'departments'],
    queryFn: getDepartmentTypes,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useDynamicRoutes() {
  return useQuery({
    queryKey: ['dynamic-permissions', 'routes'],
    queryFn: getDynamicRoutes,
  })
}

export function useDynamicColumns() {
  return useQuery({
    queryKey: ['dynamic-permissions', 'columns'],
    queryFn: getDynamicColumns,
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

