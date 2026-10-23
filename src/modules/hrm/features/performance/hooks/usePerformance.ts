import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { performanceService } from "../services";

import type { PerformanceListParams, PerformanceReview, PerformanceReviewInput, PerformanceSummary } from "../types";

export const performanceKeys = {
  all: ["performance"] as const,
  list: (params: PerformanceListParams) => ["performance", "reviews", params] as const,
  detail: (id: number) => ["performance", "review", id] as const,
  summary: ["performance", "summary"] as const,
};

export function usePerformanceReviews(params: PerformanceListParams, enabled = true) {
  return useQuery({
    queryKey: performanceKeys.list(params),
    queryFn: () => performanceService.list(params),
    enabled,
  });
}

export function usePerformanceSummary(enabled = true) {
  return useQuery<PerformanceSummary, Error>({
    queryKey: performanceKeys.summary,
    queryFn: () => performanceService.summary(),
    enabled,
  });
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient();
  return useMutation<PerformanceReview, Error, PerformanceReviewInput>({
    mutationFn: (input) => performanceService.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: performanceKeys.all }),
  });
}

export function useUpdatePerformanceReview() {
  const qc = useQueryClient();
  return useMutation<PerformanceReview, Error, { id: number; input: PerformanceReviewInput }>({
    mutationFn: ({ id, input }) => performanceService.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: performanceKeys.all }),
  });
}

export function useCompletePerformanceReview() {
  const qc = useQueryClient();
  return useMutation<PerformanceReview, Error, number>({
    mutationFn: (id) => performanceService.complete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: performanceKeys.all }),
  });
}