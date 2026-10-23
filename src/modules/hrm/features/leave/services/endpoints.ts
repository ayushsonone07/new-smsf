export const LEAVE_ENDPOINTS = {
  requests: "/api/v1/leave/requests",
  balances: "/api/v1/leave/balances",
  types: "/api/v1/leave/types",
  context: "/api/v1/leave/context",
  summary: "/api/v1/leave/summary",
  entitlements: "/api/v1/leave/entitlements",
  weeklyStatus: "/api/v1/leave/weekly-status",
  policy: "/api/v1/leave/policy",
  policySyncAll: "/api/v1/leave/policy/sync-all",
} as const;

export const LEAVE_ENDPOINT_BUILDERS = {
  request: (id: number): string => `/api/v1/leave/requests/${id}`,
  approve: (id: number): string => `/api/v1/leave/requests/${id}/approve`,
  reject: (id: number): string => `/api/v1/leave/requests/${id}/reject`,
  cancel: (id: number): string => `/api/v1/leave/requests/${id}/cancel`,
  entitlement: (id: number): string => `/api/v1/leave/entitlements/${id}`,
} as const;
