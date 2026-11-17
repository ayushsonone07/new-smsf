import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { targetsService } from "../services";
import type {
  SalesTarget,
  SalesTargetInput,
  SalesTargetListParams,
  SalesTargetProgressInput,
  SalesTargetSummary,
} from "../types";

export const targetsKeys = {
  all: ["targets"] as const,
  list: (params: SalesTargetListParams) => ["targets", "list", params] as const,
  detail: (id: number) => ["targets", "detail", id] as const,
  summary: ["targets", "summary"] as const,
  myTargets: ["targets", "my"] as const,
};

export function useSalesTargets(params: SalesTargetListParams, enabled = true) {
  return useQuery({
    queryKey: targetsKeys.list(params),
    queryFn: () => targetsService.list(params),
    enabled,
  });
}

export function useMySalesTargets(enabled = true) {
  return useQuery({
    queryKey: targetsKeys.myTargets,
    queryFn: () => targetsService.myTargets(),
    enabled,
  });
}

export function useSalesTargetSummary(enabled = true) {
  return useQuery<SalesTargetSummary, Error>({
    queryKey: targetsKeys.summary,
    queryFn: () => targetsService.summary(),
    enabled,
  });
}

export function useCreateSalesTarget() {
  const qc = useQueryClient();
  return useMutation<SalesTarget, Error, SalesTargetInput>({
    mutationFn: (input) => targetsService.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: targetsKeys.all }),
  });
}

export function useUpdateSalesTarget() {
  const qc = useQueryClient();
  return useMutation<SalesTarget, Error, { id: number; input: SalesTargetInput }>({
    mutationFn: ({ id, input }) => targetsService.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: targetsKeys.all }),
  });
}

export function useUpdateSalesTargetProgress() {
  const qc = useQueryClient();
  return useMutation<SalesTarget, Error, { id: number; input: SalesTargetProgressInput }>({
    mutationFn: ({ id, input }) => targetsService.updateProgress(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: targetsKeys.all }),
  });
}

export function useDeleteSalesTarget() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => targetsService.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: targetsKeys.all }),
  });
}
