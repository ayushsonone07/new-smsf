// Public API for the `hr` (Candidates) feature.
// External code MUST import from this file only Ã¢â‚¬â€ anything not re-exported here is private.

export { AllCandidatesPage } from "./components/AllCandidatesPage";
export { EmployeesPage } from "./components/EmployeesPage";
export { EmployeeProfilePage } from "./components/EmployeeProfilePage";
export { EmployeeAttendanceHistoryPage } from "./components/EmployeeAttendanceHistoryPage";
export { DepartmentsPage } from "./components/DepartmentsPage";
export { DesignationsPage } from "./components/DesignationsPage";
export { EmployeeOnboardingPage } from "./components/EmployeeOnboardingPage";
export { OnboardingPage } from "./components/OnboardingPage";
export { PublicOnboardingPage } from "./components/PublicOnboardingPage";

export type {
  Candidate,
  CandidateSource,
  KpiData,
  ChartsData,
  DateRange,
  Department,
  DepartmentInput,
  DepartmentManager,
  Designation,
  DesignationInput,
  EmployeeOnboardingView,
  EmployeeListItem,
  EmployeeAttendanceMonthlyResponse,
  ImportResult,
  OnboardingStatus,
  PublicOnboardingForm,
} from "./types";

export { AttendancePage } from "./components/AttendancePage";
export type { AttendanceInput, AttendanceRecord, AttendanceStatus } from "./types";

export { hrService, HR_ENDPOINTS, HR_ENDPOINT_BUILDERS } from "./services";
