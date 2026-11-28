import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { resignationsService } from "../services";
import type {
  ResignationApproveInput,
  ResignationClearanceInput,
  ResignationListParams,
  ResignationSubmitInput,
} from "../types";

export const resignationsQueryKeys = {
  all: ["resignations"] as const,
  list: (params: ResignationListParams) => ["resignations", "list", params] as const,
  summary: ["resignations", "summary"] as const,
  my: ["resignations", "my"] as const,
};

export function useResignations(params: ResignationListParams, enabled = true) {
  return useQuery({
    queryKey: resignationsQueryKeys.list(params),
    queryFn: () => resignationsService.list(params),
    enabled,
  });
}

export function useResignationSummary(enabled = true) {
  return useQuery({
    queryKey: resignationsQueryKeys.summary,
    queryFn: () => resignationsService.summary(),
    enabled,
  });
}

export function useMyResignations(enabled = true) {
  return useQuery({
    queryKey: resignationsQueryKeys.my,
    queryFn: () => resignationsService.myResignations(),
    enabled,
  });
}

export function useSubmitResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ResignationSubmitInput) => resignationsService.submit(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resignationsQueryKeys.all });
    },
  });
}

export function useApproveResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ResignationApproveInput }) =>
      resignationsService.approve(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resignationsQueryKeys.all });
    },
  });
}

export function useRejectResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: number; rejectionReason: string }) =>
      resignationsService.reject(id, rejectionReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resignationsQueryKeys.all });
    },
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, withdrawalReason }: { id: number; withdrawalReason?: string }) =>
      resignationsService.withdraw(id, withdrawalReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resignationsQueryKeys.all });
    },
  });
}

export function useUpdateResignationClearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ResignationClearanceInput }) =>
      resignationsService.updateClearance(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resignationsQueryKeys.all });
    },
  });
}

export function useCompleteResignationExit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => resignationsService.completeExit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resignationsQueryKeys.all });
    },
  });
}
