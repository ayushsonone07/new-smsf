// 👇 Sirf yahi se API URL control hoga — ek jagah comment/uncomment karo, poore app me reflect hoga.

export const API_ENDPOINTS = {
  LOCAL: 'http://localhost:8002',
  PROD: 'https://taskmbg.techmbgcard.com',
} as const

// Active URL — sirf is line ko badlo:
// Local chalana ho to: API_ENDPOINTS.LOCAL ko uncomment karo
export const ACTIVE_API_BASE_URL: string = API_ENDPOINTS.PROD
// export const ACTIVE_API_BASE_URL: string = API_ENDPOINTS.LOCAL
