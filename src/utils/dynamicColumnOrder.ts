const STORAGE_PREFIX = 'smsf.dynamic-column-order'

function storageKey(departmentType: string, routeId: string): string {
  return `${STORAGE_PREFIX}:${departmentType}:${routeId}`
}

export function readDynamicColumnOrder(
  departmentType: string,
  routeId: string,
): string[] {
  try {
    const value = localStorage.getItem(storageKey(departmentType, routeId))
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveDynamicColumnOrder(
  departmentType: string,
  routeId: string,
  columnIds: string[],
): void {
  try {
    localStorage.setItem(storageKey(departmentType, routeId), JSON.stringify(columnIds))
  } catch {
    // Storage can be unavailable in restricted/private browser contexts.
  }
}

export function applyDynamicColumnOrder<T extends { columnId: string }>(
  columns: T[],
  savedOrder: string[],
): T[] {
  if (savedOrder.length === 0) return columns
  const positions = new Map(savedOrder.map((id, index) => [id, index]))
  return columns
    .map((column, originalIndex) => ({ column, originalIndex }))
    .sort((a, b) => {
      const aPosition = positions.get(a.column.columnId)
      const bPosition = positions.get(b.column.columnId)
      if (aPosition === undefined && bPosition === undefined) return a.originalIndex - b.originalIndex
      if (aPosition === undefined) return 1
      if (bPosition === undefined) return -1
      return aPosition - bPosition
    })
    .map(({ column }) => column)
}
