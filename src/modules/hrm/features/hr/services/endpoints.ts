/**
 * Backend paths for the HR (Candidates) dashboard.
 *
 * KPIs / charts / list / search use the new HR envelope ({ success, data, error, meta }).
 * Import uses the LEGACY envelope ({ status, message, data, timestamp }) Ã¢â‚¬â€ call that
 * one with `http.post` directly, not via hrApiPost.
 */
export const HR_ENDPOINTS = {
  kpis: "/api/v1/hr/dashboard/kpis",
  charts: "/api/v1/hr/dashboard/charts",
  candidates: "/api/v1/hr/candidates",
  candidatesSearch: "/api/v1/hr/candidates/search",
  employees: "/api/v1/hr/employees",
  addCandidate: "/api/v1/hr/add/candidate",
  importCandidates: "/api/v1/hr/import/candidates",
  updateRemark: "/api/v1/hr/candidates/update-remark",
  uploadResume: "/api/v1/hr/upload_resume",
  sendInterviewMail: "/api/v1/hr/sendInterviewMail",
  attendance: "/api/v1/attendance",
  departments: "/api/v1/departments",
  departmentsManagers: "/api/v1/departments/managers",
  designations: "/api/v1/designations",
} as const;

/**
 * Path-templated endpoints. Builder functions so each id stays type-checked
 * at the call site and the URL pattern lives in one place.
 *
 * NOTE: confirm the actual backend route Ã¢â‚¬â€ REST PATCH /:id/status is a
 * reasonable default; switch this line if the backend uses verb-style
 * (e.g. /update/candidate/status with id in the body).
 */
export const HR_ENDPOINT_BUILDERS = {
  candidateStatus: (id: number): string => `/api/v1/hr/candidates/${id}/update-status`,
  candidateAdditionalInfo: (id: number): string => `/api/v1/hr/candidates/${id}/additional-info`,
  createEmployee: (candidateId: number): string =>
    `/api/v1/hr/candidates/${candidateId}/create-employee`,
  onboardingLink: (employeeId: number): string =>
    `/api/v1/hr/employees/${employeeId}/onboarding-link`,
  managerEmployees: (): string => `/api/v1/hr/employees/managers`,
  employee: (employeeId: number): string => `/api/v1/hr/employees/${employeeId}`,
  employeeStatus: (employeeId: number): string => `/api/v1/hr/employees/${employeeId}/status`,
  employeeOnboarding: (employeeId: number): string =>
    `/api/v1/hr/employees/${employeeId}/onboarding`,
  manualOnboarding: (employeeId: number): string =>
    `/api/v1/hr/employees/${employeeId}/onboarding/manual`,
  publicOnboardingForm: (token: string): string =>
    `/api/v1/onboarding/public/${encodeURIComponent(token)}`,
  publicOnboardingSubmit: (token: string): string =>
    `/api/v1/onboarding/public/${encodeURIComponent(token)}/submit`,
  verifyOnboarding: (employeeId: number): string =>
    `/api/v1/hr/employees/${employeeId}/verify-onboarding`,
  resendPasswordSetupLink: (employeeId: number): string =>
    `/api/v1/hr/employees/${employeeId}/resend-password-setup`,
  onboardingDocument: (path: string): string => path,
  resumeDownload: (fileName: string): string =>
    `/api/v1/hr/resumes/${encodeURIComponent(fileName)}`,
  resumeDelete: (candidateId: number): string => `/api/v1/hr/candidates/${candidateId}/resume`,
  requestHiringApproval: (candidateId: number): string =>
    `/api/v1/hr/candidates/${candidateId}/request-hiring-approval`,
  manualHiringApproval: (candidateId: number): string =>
    `/api/v1/hr/candidates/${candidateId}/manual-hiring-approval`,
  department: (departmentId: number): string => `/api/v1/departments/${departmentId}`,
  designation: (designationId: number): string => `/api/v1/designations/${designationId}`,
  attendanceRecord: (attendanceId: number): string => `/api/v1/attendance/${attendanceId}`,
  // UNUSED: no frontend code calls /employees/{id}/history
  // attendanceHistory: (employeeId: number): string =>
  //   `/api/v1/attendance/employees/${employeeId}/history`,
} as const;
