export type PermissionLevel = 'CAN_READ' | 'CAN_EDIT'

export interface FeaturePermission {
  id: string
  departmentId: string
  name: string
  description: string
  enabled: boolean
  roleAPermission: PermissionLevel
  roleBPermission: PermissionLevel
}

export interface UpdateFeaturePermissionRequest {
  enabled?: boolean
  roleAPermission?: PermissionLevel
  roleBPermission?: PermissionLevel
}
