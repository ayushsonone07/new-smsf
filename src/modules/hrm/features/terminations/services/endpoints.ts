export const TERMINATIONS_ENDPOINTS = {
  terminations: "/api/v1/terminations",
  summary: "/api/v1/terminations/summary",
} as const;

export const TERMINATIONS_ENDPOINT_BUILDERS = {
  precheck: (employeeId: number | string) => `/api/v1/terminations/employee/${employeeId}/precheck`,
  clearance: (id: number | string) => `/api/v1/terminations/${id}/clearance`,
  revoke: (id: number | string) => `/api/v1/terminations/${id}/revoke`,
} as const;
