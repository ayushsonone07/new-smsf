import { toApiDate } from "@shared/lib";
import { hrApiGet, hrApiGetPaged, http } from "@shared/services";
import type { ApiEnvelope } from "@shared/services";
import type { PaginationMeta } from "@shared/types";

import { HR_ENDPOINT_BUILDERS, HR_ENDPOINTS } from "./endpoints";

import type {
  AttendanceInput,
  AttendanceRecord,
  Candidate,
  CandidateStatus,
  ChartsData,
  CreateEmployeeInput,
  DateRange,
  Department,
  DepartmentInput,
  DepartmentManager,
  Designation,
  DesignationInput,
  EmployeeListItem,
  EmployeeOnboardingView,
  EmployeeStatus,
  ImportResult,
  InterviewMailInput,
  KpiData,
  ManualOnboardingInput,
  NewCandidateInput,
  OnboardingCounts,
  OnboardingLinkResponse,
  ResendPasswordSetupResponse,
  PublicOnboardingForm,
  UpdateAdditionalInfoInput,
  UpdateEmployeeInput,
  UpdateEmployeeStatusInput,
  UpdateRemarkInput,
} from "../types";

/** Turn a {from,to} Date range into the {from,to} DD/MM/YYYY params the API expects. */
function rangeParams(range?: DateRange): Record<string, string> | undefined {
  if (!range) return undefined;
  return { from: toApiDate(range.from), to: toApiDate(range.to) };
}

/**
 * HR backend expects DD/MM/YYYY with literal '/' in the query string. axios's
 * default serializer URL-encodes '/' to '%2F', which the backend rejects as
 * INVALID_DATE_FORMAT. This serializer encodes everything normally but then
 * restores '/' in values Ã¢â‚¬â€ safe because we never put structural URL chars
 * (like '?', '&', '=') in our values.
 */
function hrParamsSerializer(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.append(k, String(v));
  }
  return sp.toString().replace(/%2F/g, "/");
}

export interface EmployeesListParams {
  q?: string | undefined;
  status?: EmployeeStatus | undefined;
  onboardingStatus?: string | undefined;
  page: number;
  size: number;
  sort?: string | undefined;
}
export interface CandidatesListParams {
  range?: DateRange | undefined;
  source?: string | undefined; // lowercase
  status?: CandidateStatus | undefined;
  page: number; // 0-based
  size: number; // 1..100
  sort?: string | undefined; // "createdAt,desc"
}
export interface AttendanceListParams {
  date: string;
  startDate?: string | undefined;
  endDate?: string | undefined;
  q?: string | undefined;
  status?: string | undefined;
  page: number;
  size: number;
}

export interface AttendanceItemsData {
  items: AttendanceRecord[];
  inScope?: number | undefined;
  checkedIn?: number | undefined;
  workingNow?: number | undefined;
}

/**
 * Thin, typed wrapper over the HR endpoints. UI/hooks call this Ã¢â‚¬â€ never axios directly.
 *
 * KPIs / charts / list / search go through hrApi helpers (new envelope).
 * Import goes through the legacy `http` directly because the backend still uses
 * { status, message, data, timestamp } for that one Ã¢â‚¬â€ see endpoints.ts.
 */
export const hrService = {
  getKpis(range?: DateRange): Promise<KpiData> {
    return hrApiGet<KpiData>(HR_ENDPOINTS.kpis, {
      params: rangeParams(range),
      paramsSerializer: hrParamsSerializer,
    });
  },

  getCharts(range?: DateRange): Promise<ChartsData> {
    return hrApiGet<ChartsData>(HR_ENDPOINTS.charts, {
      params: rangeParams(range),
      paramsSerializer: hrParamsSerializer,
    });
  },

  listCandidates(
    params: CandidatesListParams,
  ): Promise<{ items: Candidate[]; meta: PaginationMeta }> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
    };
    if (params.source) query.source = params.source;
    if (params.status) query.status = params.status;
    if (params.sort) query.sort = params.sort;
    const range = rangeParams(params.range);
    if (range) Object.assign(query, range);

    return hrApiGetPaged<{ items: Candidate[] }>(HR_ENDPOINTS.candidates, {
      params: query,
      paramsSerializer: hrParamsSerializer,
    }).then(({ data, meta }) => ({ items: data.items, meta }));
  },

  searchCandidates(
    q: string,
    page: number,
    size: number,
    filters: Pick<CandidatesListParams, "source" | "status" | "range">,
  ): Promise<{ items: Candidate[]; meta: PaginationMeta }> {
    const params: Record<string, string | number> = { q, page, size };
    if (filters.source) params.source = filters.source;
    if (filters.status) params.status = filters.status;
    if (filters.range?.from) params.from = toApiDate(filters.range.from);
    if (filters.range?.to) params.to = toApiDate(filters.range.to);

    return hrApiGetPaged<{ items: Candidate[] }>(HR_ENDPOINTS.candidatesSearch, {
      params,
      paramsSerializer: hrParamsSerializer,
    }).then(({ data, meta }) => ({ items: data.items, meta }));
  },

  listEmployees(params: EmployeesListParams): Promise<{
    items: EmployeeListItem[];
    meta: PaginationMeta;
    onboardingCounts: OnboardingCounts;
  }> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
    };
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.status) query.status = params.status;
    if (params.onboardingStatus) query.onboardingStatus = params.onboardingStatus;
    if (params.sort) query.sort = params.sort;

    return hrApiGetPaged<{ items: EmployeeListItem[]; onboardingCounts: OnboardingCounts }>(
      HR_ENDPOINTS.employees,
      { params: query, paramsSerializer: hrParamsSerializer },
    ).then(({ data, meta }) => ({
      items: data.items,
      meta,
      onboardingCounts: data.onboardingCounts ?? {
        pending: 0,
        linkSent: 0,
        detailsSubmitted: 0,
        verified: 0,
      },
    }));
  },

  async listManagerEmployees(): Promise<EmployeeListItem[]> {
    const { data } = await http.get<ApiEnvelope<EmployeeListItem[]>>(
      HR_ENDPOINT_BUILDERS.managerEmployees(),
    );
    return data.data;
  },
  async getEmployee(employeeId: number): Promise<EmployeeListItem> {
    const { data } = await http.get<ApiEnvelope<EmployeeListItem>>(
      HR_ENDPOINT_BUILDERS.employee(employeeId),
    );
    return data.data;
  },

  listAttendance(params: AttendanceListParams): Promise<{
    items: AttendanceRecord[];
    meta: PaginationMeta;
    inScope: number;
    checkedIn: number;
    workingNow: number;
  }> {
    const query: Record<string, string | number> = {
      date: params.date,
      page: params.page,
      size: params.size,
    };
    if (params.startDate) query.startDate = params.startDate;
    if (params.endDate) query.endDate = params.endDate;
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.status && params.status !== "ALL") query.status = params.status;

    return hrApiGetPaged<AttendanceItemsData>(HR_ENDPOINTS.attendance + "/list", {
      params: query,
      paramsSerializer: hrParamsSerializer,
    }).then(({ data, meta }) => ({
      items: data.items,
      meta,
      inScope: data.inScope ?? 0,
      checkedIn: data.checkedIn ?? 0,
      workingNow: data.workingNow ?? 0,
    }));
  },

  async getMyAttendanceToday(): Promise<AttendanceRecord> {
    const { data } = await http.get<ApiEnvelope<AttendanceRecord>>(
      `${HR_ENDPOINTS.attendance}/me/today`,
    );
    return data.data;
  },

  async getMyAttendanceHistory(from: string, to: string): Promise<AttendanceRecord[]> {
    const { data } = await http.get<ApiEnvelope<AttendanceRecord[]>>(
      `${HR_ENDPOINTS.attendance}/me/history`,
      { params: { from, to } },
    );
    return data.data;
  },

  async listWeeklyAttendance(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const { data } = await http.get<ApiEnvelope<AttendanceRecord[]>>(`${HR_ENDPOINTS.attendance}/weekly`, {
      params: { startDate, endDate },
    });
    return data.data;
  },

  async checkIn(): Promise<AttendanceRecord> {
    const { data } = await http.post<ApiEnvelope<AttendanceRecord>>(
      `${HR_ENDPOINTS.attendance}/me/check-in`,
    );
    return data.data;
  },

  async checkOut(): Promise<AttendanceRecord> {
    const { data } = await http.patch<ApiEnvelope<AttendanceRecord>>(
      `${HR_ENDPOINTS.attendance}/me/check-out`,
    );
    return data.data;
  },

  async markAttendance(input: AttendanceInput): Promise<AttendanceRecord> {
    const { data } = await http.post<ApiEnvelope<AttendanceRecord>>(
      `${HR_ENDPOINTS.attendance}/mark`,
      input,
    );
    return data.data;
  },

  async updateAttendance(attendanceId: number, input: AttendanceInput): Promise<AttendanceRecord> {
    const { data } = await http.put<ApiEnvelope<AttendanceRecord>>(
      HR_ENDPOINT_BUILDERS.attendanceRecord(attendanceId),
      input,
    );
    return data.data;
  },

  async updateEmployee(employeeId: number, input: UpdateEmployeeInput): Promise<EmployeeListItem> {
    const { data } = await http.patch<ApiEnvelope<EmployeeListItem>>(
      HR_ENDPOINT_BUILDERS.employee(employeeId),
      input,
    );
    return data.data;
  },

  async updateEmployeeStatus(
    employeeId: number,
    input: UpdateEmployeeStatusInput,
  ): Promise<EmployeeListItem> {
    const { data } = await http.patch<ApiEnvelope<EmployeeListItem>>(
      HR_ENDPOINT_BUILDERS.employeeStatus(employeeId),
      input,
    );
    return data.data;
  },

  /**
   * POST /add/candidate Ã¢â‚¬â€ single-candidate creation. Uses the LEGACY envelope.
   * Backend's `data` field is a stringified DTO that's not useful to the UI;
   * we return the `message` so success text comes from the server.
   */
  async addCandidate(input: NewCandidateInput): Promise<string> {
    const { data } = await http.post<ApiEnvelope<string>>(HR_ENDPOINTS.addCandidate, input);
    return data.message;
  },

  /**
   * PATCH /candidates/{id}/status Ã¢â‚¬â€ change a single candidate's pipeline
   * status. Uses the LEGACY envelope. Returns the backend message so the
   * caller (toast) can surface server-authored copy.
   *
   * If the backend uses a different route (e.g. POST /update/candidate/status
   * with id in the body), change HR_ENDPOINT_BUILDERS.candidateStatus and the
   * http verb here Ã¢â‚¬â€ call sites stay untouched.
   */
  async updateCandidateStatus(id: number, status: CandidateStatus): Promise<string> {
    const { data } = await http.patch<ApiEnvelope<unknown>>(
      HR_ENDPOINT_BUILDERS.candidateStatus(id),
      { status },
    );
    return data.message;
  },

  /**
   * PATCH /candidates/update-remark Ã¢â‚¬â€ set / replace a candidate's remark.
   * Body is { id, remark } with remark as a plain string; the backend stores
   * it as { text: "..." }. Returns the backend message for the toast.
   */
  async updateCandidateRemark(input: UpdateRemarkInput): Promise<string> {
    const { data } = await http.patch<ApiEnvelope<unknown>>(HR_ENDPOINTS.updateRemark, input);
    return data.message;
  },

  async updateCandidateAdditionalInfo(input: UpdateAdditionalInfoInput): Promise<Candidate> {
    const { id, ...body } = input;
    const { data } = await http.patch<ApiEnvelope<Candidate>>(
      HR_ENDPOINT_BUILDERS.candidateAdditionalInfo(id),
      body,
    );
    return data.data;
  },

  /**
   * POST /import/candidates with a single file. Uses the LEGACY envelope, so we
   * call `http` directly and unwrap by hand.
   */
  async importCandidates(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await http.post<ApiEnvelope<ImportResult>>(
      HR_ENDPOINTS.importCandidates,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      },
    );
    return data.data;
  },

  /**
   * POST /upload_resume Ã¢â‚¬â€ attach a resume file to a candidate. Multipart form
   * with `candidateId` + `file`. Returns the backend message for a toast.
   */
  async uploadResume(candidateId: number, file: File): Promise<string> {
    const form = new FormData();
    form.append("candidateId", String(candidateId));
    form.append("file", file);
    const { data } = await http.post<ApiEnvelope<string>>(HR_ENDPOINTS.uploadResume, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
    return data.message;
  },

  /**
   * GET /resumes/{fileName} Ã¢â‚¬â€ download a stored resume as binary. We fetch via
   * axios (responseType blob) rather than a plain <a href> so the auth cookie
   * and the 401-refresh interceptor both apply. Returns the raw Blob.
   */
  async downloadResume(fileName: string): Promise<Blob> {
    const { data } = await http.get<Blob>(HR_ENDPOINT_BUILDERS.resumeDownload(fileName), {
      responseType: "blob",
    });
    return data;
  },

  /**
   * DELETE /candidates/{id}/resume Ã¢â‚¬â€ remove a candidate's resume (from storage
   * and the DB). Returns the backend message for a toast.
   */
  async deleteResume(candidateId: number): Promise<string> {
    const { data } = await http.delete<ApiEnvelope<string>>(
      HR_ENDPOINT_BUILDERS.resumeDelete(candidateId),
    );
    return data.message;
  },

  /**
   * POST /sendInterviewMail - sends an interview schedule mail to a candidate.
   * Uses the LEGACY envelope and returns the server-authored message.
   */
  async sendInterviewMail(input: InterviewMailInput): Promise<string> {
    const { data } = await http.post<ApiEnvelope<string>>(HR_ENDPOINTS.sendInterviewMail, input);
    return data.message;
  },

  async requestHiringApproval(candidateId: number): Promise<Candidate> {
    const { data } = await http.post<ApiEnvelope<Candidate>>(
      HR_ENDPOINT_BUILDERS.requestHiringApproval(candidateId),
    );
    return data.data;
  },

  async manualHiringApproval(candidateId: number, password: string): Promise<Candidate> {
    const { data } = await http.post<ApiEnvelope<Candidate>>(
      HR_ENDPOINT_BUILDERS.manualHiringApproval(candidateId),
      { password },
    );
    return data.data;
  },

  async createEmployee(input: CreateEmployeeInput): Promise<number> {
    const body = {
      ...input,
      designationId: input.designationId ?? null,
      managerId: input.managerId ?? null,
    };
    const { data } = await http.post<ApiEnvelope<number>>(HR_ENDPOINTS.employees, body);
    return data.data;
  },
  async createEmployeeFromCandidate(
    candidateId: number,
    input: CreateEmployeeInput,
  ): Promise<number> {
    const body = {
      ...input,
      designationId: input.designationId ?? null,
      managerId: input.managerId ?? null,
    };
    const { data } = await http.post<ApiEnvelope<number>>(
      HR_ENDPOINT_BUILDERS.createEmployee(candidateId),
      body,
    );
    return data.data;
  },

  async generateOnboardingLink(employeeId: number): Promise<OnboardingLinkResponse> {
    const { data } = await http.post<ApiEnvelope<OnboardingLinkResponse>>(
      HR_ENDPOINT_BUILDERS.onboardingLink(employeeId),
    );
    return data.data;
  },

  async resendPasswordSetupLink(employeeId: number): Promise<ResendPasswordSetupResponse> {
    const { data } = await http.post<ApiEnvelope<ResendPasswordSetupResponse>>(
      HR_ENDPOINT_BUILDERS.resendPasswordSetupLink(employeeId),
    );
    return data.data;
  },

  async getPublicOnboardingForm(token: string): Promise<PublicOnboardingForm> {
    const { data } = await http.get<ApiEnvelope<PublicOnboardingForm>>(
      HR_ENDPOINT_BUILDERS.publicOnboardingForm(token),
    );
    return data.data;
  },

  async submitPublicOnboarding(token: string, input: ManualOnboardingInput): Promise<string> {
    const form = new FormData();
    const {
      resume,
      aadhaarCard,
      panCard,
      experienceLetter,
      bankPassbook,
      passportPhoto,
      marksheet10,
      marksheet12,
      marksheetGraduation,
      ...fields
    } = input;
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    if (resume) form.append("resume", resume);
    if (aadhaarCard) form.append("aadhaarCard", aadhaarCard);
    if (panCard) form.append("panCard", panCard);
    if (experienceLetter) form.append("experienceLetter", experienceLetter);
    if (bankPassbook) form.append("bankPassbook", bankPassbook);
    if (passportPhoto) form.append("passportPhoto", passportPhoto);
    if (marksheet10) form.append("marksheet10", marksheet10);
    if (marksheet12) form.append("marksheet12", marksheet12);
    if (marksheetGraduation) form.append("marksheetGraduation", marksheetGraduation);

    const { data } = await http.post<ApiEnvelope<string>>(
      HR_ENDPOINT_BUILDERS.publicOnboardingSubmit(token),
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      },
    );
    return data.message;
  },
  async getEmployeeOnboarding(employeeId: number): Promise<EmployeeOnboardingView> {
    const { data } = await http.get<ApiEnvelope<EmployeeOnboardingView>>(
      HR_ENDPOINT_BUILDERS.employeeOnboarding(employeeId),
    );
    return data.data;
  },

  async saveManualOnboarding(
    employeeId: number,
    input: ManualOnboardingInput,
  ): Promise<EmployeeOnboardingView> {
    const form = new FormData();
    const {
      resume,
      aadhaarCard,
      panCard,
      experienceLetter,
      bankPassbook,
      passportPhoto,
      marksheet10,
      marksheet12,
      marksheetGraduation,
      ...fields
    } = input;
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    if (resume) form.append("resume", resume);
    if (aadhaarCard) form.append("aadhaarCard", aadhaarCard);
    if (panCard) form.append("panCard", panCard);
    if (experienceLetter) form.append("experienceLetter", experienceLetter);
    if (bankPassbook) form.append("bankPassbook", bankPassbook);
    if (passportPhoto) form.append("passportPhoto", passportPhoto);
    if (marksheet10) form.append("marksheet10", marksheet10);
    if (marksheet12) form.append("marksheet12", marksheet12);
    if (marksheetGraduation) form.append("marksheetGraduation", marksheetGraduation);

    const { data } = await http.post<ApiEnvelope<EmployeeOnboardingView>>(
      HR_ENDPOINT_BUILDERS.manualOnboarding(employeeId),
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      },
    );
    return data.data;
  },

  async verifyOnboarding(employeeId: number): Promise<string> {
    const { data } = await http.patch<ApiEnvelope<string>>(
      HR_ENDPOINT_BUILDERS.verifyOnboarding(employeeId),
    );
    return data.message;
  },

  async downloadOnboardingDocument(path: string): Promise<Blob> {
    const { data } = await http.get<Blob>(HR_ENDPOINT_BUILDERS.onboardingDocument(path), {
      responseType: "blob",
    });
    return data;
  },

  async deleteOnboardingDocument(path: string): Promise<string> {
    const { data } = await http.delete<ApiEnvelope<string>>(
      HR_ENDPOINT_BUILDERS.onboardingDocument(path),
    );
    return data.message;
  },

  async listDepartments(): Promise<Department[]> {
    const { data } = await http.get<ApiEnvelope<Department[]>>(HR_ENDPOINTS.departments);
    return data.data;
  },

  async listManagers(): Promise<DepartmentManager[]> {
    const { data } = await http.get<ApiEnvelope<DepartmentManager[]>>(
      HR_ENDPOINTS.departmentsManagers,
    );
    return data.data;
  },

  async createDepartment(input: DepartmentInput): Promise<Department> {
    const { data } = await http.post<ApiEnvelope<Department>>(HR_ENDPOINTS.departments, input);
    return data.data;
  },

  async updateDepartment(departmentId: number, input: DepartmentInput): Promise<Department> {
    const { data } = await http.put<ApiEnvelope<Department>>(
      HR_ENDPOINT_BUILDERS.department(departmentId),
      input,
    );
    return data.data;
  },

  async deleteDepartment(departmentId: number): Promise<string> {
    const { data } = await http.delete<ApiEnvelope<string>>(
      HR_ENDPOINT_BUILDERS.department(departmentId),
    );
    return data.message;
  },

  async listDesignations(): Promise<Designation[]> {
    const { data } = await http.get<ApiEnvelope<Designation[]>>(HR_ENDPOINTS.designations);
    return data.data;
  },

  async createDesignation(input: DesignationInput): Promise<Designation> {
    const { data } = await http.post<ApiEnvelope<Designation>>(HR_ENDPOINTS.designations, input);
    return data.data;
  },

  async updateDesignation(designationId: number, input: DesignationInput): Promise<Designation> {
    const { data } = await http.put<ApiEnvelope<Designation>>(
      HR_ENDPOINT_BUILDERS.designation(designationId),
      input,
    );
    return data.data;
  },

  async deleteDesignation(designationId: number): Promise<string> {
    const { data } = await http.delete<ApiEnvelope<string>>(
      HR_ENDPOINT_BUILDERS.designation(designationId),
    );
    return data.message;
  },
};
