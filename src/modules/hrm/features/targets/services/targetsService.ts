import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { HrApiException, hrApiGet, hrApiGetPaged, http } from "@shared/services";

import { TARGETS_ENDPOINT_BUILDERS, TARGETS_ENDPOINTS } from "./endpoints";
import type {
  SalesTarget,
  SalesTargetInput,
  SalesTargetListParams,
  SalesTargetProgressInput,
  SalesTargetSummary,
} from "../types";

function queryString(params: SalesTargetListParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
}

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === null) {
    throw new HrApiException(envelope.error ?? { code: "UNKNOWN", message: "Unknown error" });
  }
  return envelope.data;
}

export const targetsService = {
  async list(params: SalesTargetListParams): Promise<{ data: SalesTarget[]; meta: PaginationMeta }> {
    return hrApiGetPaged<SalesTarget[]>(TARGETS_ENDPOINTS.targets + queryString(params));
  },

  async get(id: number): Promise<SalesTarget> {
    return hrApiGet<SalesTarget>(TARGETS_ENDPOINT_BUILDERS.target(id));
  },

  async summary(): Promise<SalesTargetSummary> {
    return hrApiGet<SalesTargetSummary>(TARGETS_ENDPOINTS.summary);
  },

  async myTargets(): Promise<SalesTarget[]> {
    return hrApiGet<SalesTarget[]>(TARGETS_ENDPOINTS.myTargets);
  },

  async create(input: SalesTargetInput): Promise<SalesTarget> {
    const { data } = await http.post<HrApiEnvelope<SalesTarget>>(TARGETS_ENDPOINTS.targets, input);
    return unwrap(data);
  },

  async update(id: number, input: SalesTargetInput): Promise<SalesTarget> {
    const { data } = await http.put<HrApiEnvelope<SalesTarget>>(TARGETS_ENDPOINT_BUILDERS.target(id), input);
    return unwrap(data);
  },

  async updateProgress(id: number, input: SalesTargetProgressInput): Promise<SalesTarget> {
    const { data } = await http.patch<HrApiEnvelope<SalesTarget>>(TARGETS_ENDPOINT_BUILDERS.progress(id), input);
    return unwrap(data);
  },

  async delete(id: number): Promise<void> {
    await http.delete(TARGETS_ENDPOINT_BUILDERS.target(id));
  },
};
