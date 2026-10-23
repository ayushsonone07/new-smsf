import { hrApiGet, hrApiGetPaged, http, HrApiException } from "@shared/services";
import type { HrApiEnvelope, PaginationMeta } from "@shared/types";

import { ANNOUNCEMENT_ENDPOINT_BUILDERS, ANNOUNCEMENT_ENDPOINTS } from "./endpoints";

import type { Announcement, AnnouncementInput, AnnouncementListParams } from "../types";

function queryString(params: AnnouncementListParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&")}`;
}

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === undefined) {
    throw new HrApiException(envelope.error ?? { code: "UNKNOWN", message: "Unknown error" });
  }
  return envelope.data as T;
}

export const announcementService = {
  async list(params: AnnouncementListParams): Promise<{ data: Announcement[]; meta: PaginationMeta }> {
    return hrApiGetPaged<Announcement[]>(ANNOUNCEMENT_ENDPOINTS.announcements + queryString(params));
  },

  async get(id: number): Promise<Announcement> {
    return hrApiGet<Announcement>(ANNOUNCEMENT_ENDPOINT_BUILDERS.announcement(id));
  },

  async create(input: AnnouncementInput): Promise<Announcement> {
    const { data } = await http.post<HrApiEnvelope<Announcement>>(ANNOUNCEMENT_ENDPOINTS.announcements, input);
    return unwrap(data);
  },

  async update(id: number, input: AnnouncementInput): Promise<Announcement> {
    const { data } = await http.put<HrApiEnvelope<Announcement>>(ANNOUNCEMENT_ENDPOINT_BUILDERS.announcement(id), input);
    return unwrap(data);
  },

  async remove(id: number): Promise<void> {
    const { data } = await http.delete<HrApiEnvelope<void>>(ANNOUNCEMENT_ENDPOINT_BUILDERS.announcement(id));
    unwrap(data);
  },
};