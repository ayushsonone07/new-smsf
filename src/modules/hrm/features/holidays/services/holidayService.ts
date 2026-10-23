import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { hrApiGet, hrApiGetPaged, http, HrApiException } from "@shared/services";

import { HOLIDAY_ENDPOINT_BUILDERS, HOLIDAY_ENDPOINTS } from "./endpoints";

import type { Holiday, HolidayInput, HolidayListParams } from "../types";

function queryString(params: HolidayListParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&")}`;
}

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === null) {
    throw new HrApiException(envelope.error ?? { code: "UNKNOWN", message: "Unknown error" });
  }
  return envelope.data;
}

export const holidayService = {
  async list(params: HolidayListParams): Promise<{ data: Holiday[]; meta: PaginationMeta }> {
    return hrApiGetPaged<Holiday[]>(HOLIDAY_ENDPOINTS.holidays + queryString(params));
  },

  async get(id: number): Promise<Holiday> {
    return hrApiGet<Holiday>(HOLIDAY_ENDPOINT_BUILDERS.holiday(id));
  },

  async create(input: HolidayInput): Promise<Holiday> {
    const { data } = await http.post<HrApiEnvelope<Holiday>>(HOLIDAY_ENDPOINTS.holidays, input);
    return unwrap(data);
  },

  async update(id: number, input: HolidayInput): Promise<Holiday> {
    const { data } = await http.put<HrApiEnvelope<Holiday>>(HOLIDAY_ENDPOINT_BUILDERS.holiday(id), input);
    return unwrap(data);
  },

  async remove(id: number): Promise<void> {
    const { data } = await http.delete<HrApiEnvelope<void>>(HOLIDAY_ENDPOINT_BUILDERS.holiday(id));
    unwrap(data);
  },
};