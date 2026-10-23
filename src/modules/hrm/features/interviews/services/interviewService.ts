import { hrApiGet, hrApiGetPaged, hrApiPatch, hrApiPost, hrApiPut } from "@shared/services";

import type { Interview, InterviewInput, InterviewStatusChange } from "../types";

export const INTERVIEW_ENDPOINTS = {
  base: "/api/v1/interviews",
} as const;

export const interviewService = {
  async list(params?: {
    search?: string;
    status?: string;
    candidateId?: number;
    interviewerId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ data: Interview[]; meta: { page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean } }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.candidateId != null) searchParams.set("candidateId", String(params.candidateId));
    if (params?.interviewerId != null) searchParams.set("interviewerId", String(params.interviewerId));
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.page != null) searchParams.set("page", String(params.page));
    if (params?.size != null) searchParams.set("size", String(params.size));
    if (params?.sort) searchParams.set("sort", params.sort);
    const qs = searchParams.toString();
    const url = qs ? `${INTERVIEW_ENDPOINTS.base}?${qs}` : INTERVIEW_ENDPOINTS.base;
    return hrApiGetPaged<Interview[]>(url);
  },

  async get(id: number): Promise<Interview> {
    return hrApiGet<Interview>(`${INTERVIEW_ENDPOINTS.base}/${id}`);
  },

  async create(data: InterviewInput): Promise<Interview> {
    return hrApiPost<Interview>(INTERVIEW_ENDPOINTS.base, data);
  },

  async update(id: number, data: InterviewInput): Promise<Interview> {
    return hrApiPut<Interview>(`${INTERVIEW_ENDPOINTS.base}/${id}`, data);
  },

  async updateStatus(id: number, data: InterviewStatusChange): Promise<Interview> {
    return hrApiPatch<Interview>(`${INTERVIEW_ENDPOINTS.base}/${id}/status`, data);
  },
};
