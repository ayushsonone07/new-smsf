export const PERFORMANCE_ENDPOINTS = {
  reviews: "/api/v1/performance/reviews",
  myReviews: "/api/v1/performance/reviews/my",
  summary: "/api/v1/performance/summary",
} as const;

export const PERFORMANCE_ENDPOINT_BUILDERS = {
  review: (id: number): string => `/api/v1/performance/reviews/${id}`,
  complete: (id: number): string => `/api/v1/performance/reviews/${id}/complete`,
} as const;