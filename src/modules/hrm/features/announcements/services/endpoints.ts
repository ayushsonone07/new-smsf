export const ANNOUNCEMENT_ENDPOINTS = {
  announcements: "/api/v1/announcements",
} as const;

export const ANNOUNCEMENT_ENDPOINT_BUILDERS = {
  announcement: (id: number): string => `/api/v1/announcements/${id}`,
} as const;