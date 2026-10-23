import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PaginationMeta } from "@shared/types";

import { leaveService } from "../services";

import type {
  LeaveApprovalInput,
  LeaveBalance,
  LeaveContext,
  LeaveListParams,
  LeaveRequest,
  LeaveRequestInput,
  LeaveStatusDistribution,
  LeaveSummary,
  LeaveTypeInfo,
} from "../types";

export const leaveKeys = {
  all: ["leave"] as const,
  requests: (params?: LeaveListParams) => ["leave", "requests", params] as const,
  request: (id: number) => ["leave", "request", id] as const,
  balances: ["leave", "balances"] as const,
  types: ["leave", "types"] as const,
  context: ["leave", "context"] as const,
  summary: ["leave", "summary"] as const,
};

export function useLeaveRequests(params?: LeaveListParams) {
  return useQuery<{ data: LeaveRequest[]; meta: PaginationMeta }, Error>({
    queryKey: leaveKeys.requests(params),
    queryFn: () => leaveService.listRequests(params ?? {}),
  });
}

export function useLeaveRequest(id: number) {
  return useQuery<LeaveRequest, Error>({
    queryKey: leaveKeys.request(id),
    queryFn: () => leaveService.getRequest(id),
    enabled: id > 0,
  });
}

export function useLeaveBalances() {
  return useQuery<LeaveBalance[], Error>({
    queryKey: leaveKeys.balances,
    queryFn: () => leaveService.getBalances(),
  });
}

export function useLeaveTypes() {
  return useQuery<LeaveTypeInfo[], Error>({
    queryKey: leaveKeys.types,
    queryFn: () => leaveService.getLeaveTypes(),
  });
}

export function useLeaveSummary() {
  return useQuery<LeaveSummary, Error>({
    queryKey: leaveKeys.summary,
    queryFn: () => leaveService.getSummary(),
  });
}

export function useWeeklyLeaveStatus(startDate: string, endDate: string) {
  return useQuery<LeaveStatusDistribution[], Error>({
    queryKey: ["leave", "weekly-status", startDate, endDate],
    queryFn: () => leaveService.getWeeklyLeaveStatus(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });
}

export function useLeaveContext() {
  return useQuery<LeaveContext, Error>({
    queryKey: leaveKeys.context,
    queryFn: () => leaveService.getContext(),
  });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, Error, LeaveRequestInput>({
    mutationFn: (input) => leaveService.applyLeave(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, Error, LeaveApprovalInput>({
    mutationFn: (input) => leaveService.approveLeave(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, Error, LeaveApprovalInput>({
    mutationFn: (input) => leaveService.rejectLeave(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => leaveService.cancelLeave(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}
