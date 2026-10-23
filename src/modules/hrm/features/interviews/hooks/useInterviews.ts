import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { interviewService } from "../services/interviewService";

import type { Interview, InterviewInput, InterviewStatusChange } from "../types";

export interface InterviewListParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const interviewKeys = {
  all: ["interviews"] as const,
  list: (params?: InterviewListParams) => ["interviews", "list", params] as const,
  detail: (id: number) => ["interviews", "detail", id] as const,
};

export function useInterviews(params?: InterviewListParams) {
  return useQuery({
    queryKey: interviewKeys.list(params),
    queryFn: () => interviewService.list(params),
  });
}

export function useInterview(id: number) {
  return useQuery<Interview, Error>({
    queryKey: interviewKeys.detail(id),
    queryFn: () => interviewService.get(id),
    enabled: id > 0,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InterviewInput) => interviewService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: interviewKeys.all }); },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InterviewInput }) => interviewService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: interviewKeys.all }); },
  });
}

export function useUpdateInterviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InterviewStatusChange }) => interviewService.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: interviewKeys.all }); },
  });
}
