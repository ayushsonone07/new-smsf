import { delay, featurePermissions } from './mock/db'
import type {
  FeaturePermission,
  UpdateFeaturePermissionRequest,
} from '../features/permissions/types/permission.types'

export async function getFeaturePermissions(
  departmentId: string,
): Promise<FeaturePermission[]> {
  await delay()

  return structuredClone(
    featurePermissions.filter(
      (feature) =>
        feature.departmentId === departmentId,
    ),
  )
}

export async function updateFeaturePermission(
  id: string,
  data: UpdateFeaturePermissionRequest,
): Promise<FeaturePermission> {
  await delay(250)

  const feature = featurePermissions.find(
    (item) => item.id === id,
  )

  if (!feature) {
    throw new Error('Feature permission not found')
  }

  Object.assign(feature, data)

  return structuredClone(feature)
}
