import type { Department } from '../types/department.types'

/** One department head per department type (the first one found), as the Departments list shows them. */
export function uniqueDepartmentHeads(departments: Department[]): Department[] {
  const headMap = new Map<string, Department>()
  for (const dept of departments) {
    if (dept.role === 'DEPARTMENT_HEAD') {
      const typeKey = dept.type || 'unknown'
      if (!headMap.has(typeKey)) {
        headMap.set(typeKey, dept)
      }
    }
  }
  return Array.from(headMap.values())
}
