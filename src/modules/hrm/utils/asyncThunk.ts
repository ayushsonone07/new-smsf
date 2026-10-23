import { isAxiosError } from "axios";

export interface ApiErrorPayload {
  message: string;
  status?: number | undefined;
  fieldErrors?: Record<string, string> | undefined;
}

export function extractFieldErrors(
  error: unknown,
): Record<string, string> | undefined {
  if (!isAxiosError(error)) return undefined;
  const body = error.response?.data as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return undefined;

  if ("fieldErrors" in body && typeof body.fieldErrors === "object") {
    return body.fieldErrors as Record<string, string>;
  }

  if ("errors" in body && typeof body.errors === "object") {
    return body.errors as Record<string, string>;
  }

  return undefined;
}
