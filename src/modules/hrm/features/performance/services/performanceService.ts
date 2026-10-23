import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { HrApiException, hrApiGet, hrApiGetPaged, http } from "@shared/services";

import { PERFORMANCE_ENDPOINT_BUILDERS, PERFORMANCE_ENDPOINTS } from "./endpoints";

import type { PerformanceListParams, PerformanceReview, PerformanceReviewInput, PerformanceSummary } from "../types";

function queryString(params: PerformanceListParams): string {
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

export const performanceService = {
  async list(params: PerformanceListParams): Promise<{ data: PerformanceReview[]; meta: PaginationMeta }> {
    return hrApiGetPaged<PerformanceReview[]>(PERFORMANCE_ENDPOINTS.reviews + queryString(params));
  },

  async get(id: number): Promise<PerformanceReview> {
    return hrApiGet<PerformanceReview>(PERFORMANCE_ENDPOINT_BUILDERS.review(id));
  },

  async summary(): Promise<PerformanceSummary> {
    return hrApiGet<PerformanceSummary>(PERFORMANCE_ENDPOINTS.summary);
  },

  async myReviews(): Promise<PerformanceReview[]> {
    return hrApiGet<PerformanceReview[]>(PERFORMANCE_ENDPOINTS.myReviews);
  },

  async create(input: PerformanceReviewInput): Promise<PerformanceReview> {
    const { data } = await http.post<HrApiEnvelope<PerformanceReview>>(PERFORMANCE_ENDPOINTS.reviews, input);
    return unwrap(data);
  },

  async update(id: number, input: PerformanceReviewInput): Promise<PerformanceReview> {
    const { data } = await http.put<HrApiEnvelope<PerformanceReview>>(PERFORMANCE_ENDPOINT_BUILDERS.review(id), input);
    return unwrap(data);
  },

  async complete(id: number): Promise<PerformanceReview> {
    const { data } = await http.post<HrApiEnvelope<PerformanceReview>>(PERFORMANCE_ENDPOINT_BUILDERS.complete(id));
    return unwrap(data);
  },
};