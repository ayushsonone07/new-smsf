import { getApiErrorMessage } from "@shared/lib";

import type { ApiErrorPayload } from "./asyncThunk";

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  return getApiErrorMessage(error, fallback);
}

export function normalizeApiError(
  error: unknown,
  fallback: string,
): ApiErrorPayload {
  const message = getApiErrorMessage(error, fallback);
  let status: number | undefined;
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as { response?: { status?: number } }).response;
    status = resp?.status;
  }
  return { message, status };
}

export { getApiErrorMessage };
