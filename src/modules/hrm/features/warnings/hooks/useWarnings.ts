import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { warningsService } from "../services";
import type { WarningInput, WarningListParams, WarningStatus } from "../types";

export const warningsQueryKeys = {
  all: ["warnings"] as const,
  list: (params: WarningListParams) => ["warnings", "list", params] as const,
  summary: ["warnings", "summary"] as const,
  my: ["warnings", "my"] as const,
  employeeCount: (employeeId: number) => ["warnings", "employeeCount", employeeId] as const,
};

export function useWarnings(params: WarningListParams, enabled = true) {
  return useQuery({
    queryKey: warningsQueryKeys.list(params),
    queryFn: () => warningsService.list(params),
    enabled,
  });
}

export function useWarningSummary(enabled = true) {
  return useQuery({
    queryKey: warningsQueryKeys.summary,
    queryFn: () => warningsService.summary(),
    enabled,
  });
}

export function useMyWarnings(enabled = true) {
  return useQuery({
    queryKey: warningsQueryKeys.my,
    queryFn: () => warningsService.myWarnings(),
    enabled,
  });
}

export function useEmployeeWarningCount(employeeId: number | "", enabled = true) {
  return useQuery({
    queryKey: warningsQueryKeys.employeeCount(Number(employeeId) || 0),
    queryFn: () => warningsService.countForEmployee(Number(employeeId)),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useCreateWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WarningInput) => warningsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warningsQueryKeys.all });
    },
  });
}

export function useAcknowledgeWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeResponse }: { id: number; employeeResponse?: string }) =>
      warningsService.acknowledge(id, employeeResponse),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warningsQueryKeys.all });
    },
  });
}

export function useUpdateWarningStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: WarningStatus }) =>
      warningsService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warningsQueryKeys.all });
    },
  });
}

export function useDeleteWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => warningsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warningsQueryKeys.all });
    },
  });
}
