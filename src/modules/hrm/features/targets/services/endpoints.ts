export const TARGETS_ENDPOINTS = {
  targets: "/api/v1/targets",
  myTargets: "/api/v1/targets/my",
  summary: "/api/v1/targets/summary",
} as const;

export const TARGETS_ENDPOINT_BUILDERS = {
  target: (id: number): string => `/api/v1/targets/${id}`,
  progress: (id: number): string => `/api/v1/targets/${id}/progress`,
} as const;
