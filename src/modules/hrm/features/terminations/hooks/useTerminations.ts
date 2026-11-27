import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { terminationsService } from "../services";
import type {
  TerminationClearanceInput,
  TerminationInput,
  TerminationListParams,
} from "../types";

export const terminationsQueryKeys = {
  all: ["terminations"] as const,
  list: (params: TerminationListParams) => ["terminations", "list", params] as const,
  summary: ["terminations", "summary"] as const,
  precheck: (employeeId: number) => ["terminations", "precheck", employeeId] as const,
};

export function useTerminations(params: TerminationListParams, enabled = true) {
  return useQuery({
    queryKey: terminationsQueryKeys.list(params),
    queryFn: () => terminationsService.list(params),
    enabled,
  });
}

export function useTerminationSummary(enabled = true) {
  return useQuery({
    queryKey: terminationsQueryKeys.summary,
    queryFn: () => terminationsService.summary(),
    enabled,
  });
}

export function useTerminationPrecheck(employeeId: number | "", enabled = true) {
  return useQuery({
    queryKey: terminationsQueryKeys.precheck(Number(employeeId) || 0),
    queryFn: () => terminationsService.precheck(Number(employeeId)),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TerminationInput) => terminationsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: terminationsQueryKeys.all });
    },
  });
}

export function useUpdateTerminationClearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TerminationClearanceInput }) =>
      terminationsService.updateClearance(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: terminationsQueryKeys.all });
    },
  });
}

export function useRevokeTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revokedReason }: { id: number; revokedReason: string }) =>
      terminationsService.revoke(id, revokedReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: terminationsQueryKeys.all });
    },
  });
}
