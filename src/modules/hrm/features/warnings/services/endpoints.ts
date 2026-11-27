export const WARNINGS_ENDPOINTS = {
  warnings: "/api/v1/warnings",
  summary: "/api/v1/warnings/summary",
  myWarnings: "/api/v1/warnings/my",
} as const;

export const WARNINGS_ENDPOINT_BUILDERS = {
  warning: (id: number | string) => `/api/v1/warnings/${id}`,
  acknowledge: (id: number | string) => `/api/v1/warnings/${id}/acknowledge`,
  status: (id: number | string) => `/api/v1/warnings/${id}/status`,
  employeeCount: (employeeId: number | string) => `/api/v1/warnings/employee/${employeeId}/count`,
} as const;
