import { isAxiosError } from "axios";

import { HrApiException } from "@shared/services";

/**
 * Pull a human-readable message out of any API failure, handling both envelope
 * shapes the backend uses:
 *
 *   Legacy:  { status, message, data, timestamp }
 *   HR:      { success, data, error: { code, message, field }, meta }
 *
 * Plus HrApiException (thrown by hrApi* helpers on success:false) and any
 * other Error. Falls back to a generic string so a UI surface always has
 * something to display.
 */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof HrApiException) {
    return error.message;
  }
  if (isAxiosError(error)) {
    const body = error.response?.data as unknown;
    if (body && typeof body === "object") {
      // HR envelope: { error: { message } }
      if ("error" in body && body.error && typeof body.error === "object") {
        const inner = body.error as { message?: unknown };
        if (typeof inner.message === "string" && inner.message.length > 0) {
          return inner.message;
        }
      }
      // Legacy envelope: { message }
      if ("message" in body) {
        const m = body.message;
        if (typeof m === "string" && m.length > 0) return m;
      }
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
