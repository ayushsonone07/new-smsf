import type { HrApiEnvelope, HrApiError, PaginationMeta } from "@shared/types";

import { http } from "./http";

import type { AxiosRequestConfig } from "axios";

/**
 * Thrown when an HR-envelope response comes back with `success: false`.
 * Carries the structured error so call sites (or UI mappers) can branch on
 * `code` and surface `field` for input highlighting.
 */
export class HrApiException extends Error {
  readonly code: string;
  readonly field: string | undefined;

  constructor(error: HrApiError) {
    super(error.message);
    this.name = "HrApiException";
    this.code = error.code;
    this.field = error.field;
  }
}

const UNKNOWN_ERROR: HrApiError = { code: "UNKNOWN", message: "Unknown error" };

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === undefined) {
    throw new HrApiException(envelope.error ?? UNKNOWN_ERROR);
  }
  return envelope.data as T;
}

/** GET that unwraps an HR envelope. Returns data, throws HrApiException on failure. */
export async function hrApiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await http.get<HrApiEnvelope<T>>(url, config);
  return unwrap(data);
}

/** GET that also returns pagination meta. Use for list/search endpoints. */
export async function hrApiGetPaged<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ data: T; meta: PaginationMeta }> {
  const { data: envelope } = await http.get<HrApiEnvelope<T>>(url, config);
  const data = unwrap(envelope);
  if (!envelope.meta) {
    throw new HrApiException({
      code: "MISSING_META",
      message: "Expected pagination meta in response but got none.",
    });
  }
  return { data, meta: envelope.meta };
}

/** POST that unwraps an HR envelope. */
export async function hrApiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await http.post<HrApiEnvelope<T>>(url, body, config);
  return unwrap(data);
}

/** PUT that unwraps an HR envelope. */
export async function hrApiPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await http.put<HrApiEnvelope<T>>(url, body, config);
  return unwrap(data);
}

/** PATCH that unwraps an HR envelope. */
export async function hrApiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await http.patch<HrApiEnvelope<T>>(url, body, config);
  return unwrap(data);
}

/** DELETE that unwraps an HR envelope. */
export async function hrApiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await http.delete<HrApiEnvelope<T>>(url, config);
  return unwrap(data);
}
