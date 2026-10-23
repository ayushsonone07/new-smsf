import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PaginationMeta } from "@shared/types";

import { hrService } from "../services";

import type { AttendanceListParams } from "../services";
import type { AttendanceInput, AttendanceRecord } from "../types";

export interface AttendanceQueryResult {
  items: AttendanceRecord[];
  meta: PaginationMeta;
  inScope: number;
  checkedIn: number;
  workingNow: number;
}

export const attendanceQueryKey = (params: AttendanceListParams) =>
  ["hr", "attendance", params] as const;
export const myAttendanceTodayKey = ["hr", "attendance", "me", "today"] as const;

export function useAttendance(params: AttendanceListParams) {
  return useQuery<AttendanceQueryResult, Error>({
    queryKey: attendanceQueryKey(params),
    queryFn: () => hrService.listAttendance(params),
    enabled: Boolean(params.date),
  });
}

export function useWeeklyAttendance(from: string, to: string) {
  const query = useQuery<AttendanceRecord[], Error>({
    queryKey: ["hr", "attendance", "weekly", from, to],
    queryFn: () => hrService.listWeeklyAttendance(from, to),
    enabled: Boolean(from && to),
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useMyAttendanceToday() {
  return useQuery<AttendanceRecord, Error>({
    queryKey: myAttendanceTodayKey,
    queryFn: () => hrService.getMyAttendanceToday(),
    refetchOnWindowFocus: false,
  });
}

export function useMyAttendanceHistory(from: string, to: string) {
  return useQuery<AttendanceRecord[], Error>({
    queryKey: ["hr", "attendance", "me", "history", from, to],
    queryFn: () => hrService.getMyAttendanceHistory(from, to),
    enabled: Boolean(from && to),
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error>({
    mutationFn: () => hrService.checkIn(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["hr", "attendance"] }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error>({
    mutationFn: () => hrService.checkOut(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["hr", "attendance"] }),
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error, AttendanceInput>({
    mutationFn: (input) => hrService.markAttendance(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "attendance"] });
      void qc.invalidateQueries({ queryKey: ["hr", "employees"] });
    },
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecord, Error, { id: number; input: AttendanceInput }>({
    mutationFn: ({ id, input }) => hrService.updateAttendance(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "attendance"] });
    },
  });
}
