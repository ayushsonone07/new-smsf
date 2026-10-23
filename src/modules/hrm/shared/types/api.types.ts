/**
 * HR API envelope: { success, data, error, meta }.
 *
 * Used by the HR dashboard endpoints under /api/v1/hr (KPIs, charts, list, search).
 * Distinct from `ApiEnvelope` in shared/services/http.ts, which is the
 * { status, message, data, timestamp } shape used by auth and the legacy import
 * endpoint. Both coexist — don't try to unify them without backend buy-in.
 */
export interface HrApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: HrApiError | null;
  meta: PaginationMeta | null;
}

/**
 * Structured error returned when `success: false`.
 * `field` (when present) points at the input that triggered the error so the UI
 * can highlight it; `code` lets us branch on error type without parsing messages.
 */
export interface HrApiError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Pagination metadata returned alongside paginated list responses.
 * page is 0-based.
 */
export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}
