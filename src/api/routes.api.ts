import { authedApiRequest } from './client'

export interface RouteInfo {
  routeId: string
  routeName: string
}

export interface RoutesApiResponse {
  status: number
  message: string
  data: RouteInfo[]
  success: boolean
}

export async function getRoutes(): Promise<RouteInfo[]> {
  const response = await authedApiRequest<RoutesApiResponse>('/api/auth/routs')
  return response.data
}