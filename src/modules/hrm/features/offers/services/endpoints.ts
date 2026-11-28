export const OFFERS_ENDPOINTS = {
  offers: "/api/v1/offers",
  myOffers: "/api/v1/offers/my",
  summary: "/api/v1/offers/summary",
} as const;

export const OFFERS_ENDPOINT_BUILDERS = {
  offer: (id: number | string) => `/api/v1/offers/${id}`,
  pdf: (id: number | string) => `/api/v1/offers/${id}/pdf`,
  status: (id: number | string) => `/api/v1/offers/${id}/status`,
} as const;
