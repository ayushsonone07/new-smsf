export const HOLIDAY_ENDPOINTS = {
  holidays: "/api/v1/holidays",
} as const;

export const HOLIDAY_ENDPOINT_BUILDERS = {
  holiday: (id: number): string => `/api/v1/holidays/${id}`,
} as const;