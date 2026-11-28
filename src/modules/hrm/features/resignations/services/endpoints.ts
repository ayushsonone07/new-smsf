export const RESIGNATIONS_ENDPOINTS = {
  resignations: "/api/v1/resignations",
  summary: "/api/v1/resignations/summary",
  myResignations: "/api/v1/resignations/my",
} as const;

export const RESIGNATIONS_ENDPOINT_BUILDERS = {
  approve: (id: number | string) => `/api/v1/resignations/${id}/approve`,
  reject: (id: number | string) => `/api/v1/resignations/${id}/reject`,
  withdraw: (id: number | string) => `/api/v1/resignations/${id}/withdraw`,
  clearance: (id: number | string) => `/api/v1/resignations/${id}/clearance`,
  complete: (id: number | string) => `/api/v1/resignations/${id}/complete`,
} as const;
