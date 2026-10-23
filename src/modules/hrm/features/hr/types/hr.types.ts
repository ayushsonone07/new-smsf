/**
 * Domain types for the HR (Candidates) dashboard.
 *
 * Sources are lowercase strings from the backend; we narrow to a known union
 * but `(string & {}) | CandidateSource` so an unknown value from the API still
 * renders (mapped to the "other" pill) instead of throwing.
 */

export type CandidateSource = "linkedin" | "naukri" | "referral" | "walk_in" | "college" | "other";

/**
 * All candidate pipeline statuses. The order here is the order shown in the
 * status dropdown (NEW first ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ ON_HOLD last), grouped roughly by stage:
 *   - active workflow: NEW ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ SHORTLISTED ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ CONTACTED ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ IN_PROCESS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ INTERVIEW ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ OFFERED
 *   - terminal:        HIRED, REJECTED, WITHDRAWN
 *   - paused:          ON_HOLD
 *
 * Add a new status by adding it here AND in STATUS_META in StatusMenu.tsx.
 */
export const CANDIDATE_STATUSES = [
  "NEW",
  "SHORTLISTED",
  "CONTACTED",
  "IN_PROCESS",
  "INTERVIEW",
  "OFFERED",
  "REQUEST_HIRING_APPROVAL",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
  "ON_HOLD",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const HIRING_APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "FAILED"] as const;

export type HiringApprovalStatus = (typeof HIRING_APPROVAL_STATUSES)[number];

export const ONBOARDING_STATUSES = [
  "PENDING",
  "LINK_SENT",
  "DETAILS_SUBMITTED",
  "VERIFIED",
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";

export type EmployeeStatus = "active" | "on_leave" | "notice" | "terminated";

export type UserRole = "admin" | "hr" | "sub_hr" | "manager" | "employee" | "visitor";

export interface KpiData {
  totalCandidates: number;
  addedToday: number;
  addedThisWeek: number;
  addedThisMonth: number;
  monthOverMonthGrowthPct: number;
  /** Null when there are no candidates in the window ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â no source to rank. */
  topSource: { source: string; count: number; pct: number } | null;
  activeSources: number;
  phoneDuplicates: number;
  withRemarksPct: number;
  updatedLast7Days: number;
}

export interface DailyIntakePoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SourceBreakdownRow {
  source: string;
  count: number;
  pct: number;
}

export interface SourceTrendRow {
  month: string; // YYYY-MM
  source: string;
  count: number;
}

export interface DayOfWeekPoint {
  day: string; // MON, TUE, ...
  count: number;
}

export interface HourOfDayPoint {
  hour: number; // 0..23
  count: number;
}

export interface CumulativeGrowthPoint {
  date: string; // YYYY-MM-DD
  total: number;
}

export interface ChartsData {
  dailyIntake: DailyIntakePoint[];
  sourceBreakdown: SourceBreakdownRow[];
  sourceTrend: SourceTrendRow[];
  byDayOfWeek: DayOfWeekPoint[];
  byHourOfDay: HourOfDayPoint[];
  cumulativeGrowth: CumulativeGrowthPoint[];
}

/** A single candidate row in the list/search responses. */
export interface Candidate {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string; // lowercase; normalize at the pill component
  status: string; // e.g. "NEW", "CONTACTED", "INTERVIEWING", "HIRED", "REJECTED"
  recruiterId: number | null;
  recruiterName: string | null;
  employeeId: number | null;
  onboardingStatus: OnboardingStatus | null;
  hiringApprovalStatus: HiringApprovalStatus | null;
  taskcrmRequestId: string | null;
  hiringApprovalRemarks: string | null;
  hiringApprovalFailureReason: string | null;
  remark: unknown; // parsed JSON: object | array | null ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â never a string
  city: string | null;
  experience: string | null;
  hasLaptop: boolean | null;
  education: string | null;
  term: string | null;
  /** Download path like "/api/v1/hr/resumes/<uuid>.pdf"; null when no resume uploaded. */
  resumeUrl: string | null;
  createdAt: string; // ISO UTC
  updatedAt: string | null; // null when never updated
}

export interface EmployeeListItem {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  joiningDate: string;
  exitDate: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  onboardingStatus: OnboardingStatus;
  isPresent: boolean | null;
  departmentId: number | null;
  departmentName: string | null;
  designationId: number | null;
  designationName: string | null;
  managerId: number | null;
  managerName: string | null;
  candidateId: number | null;
  createdAt: string;
  updatedAt: string | null;
  /** Name of the HR user who verified/completed onboarding; null until VERIFIED. */
  onboardedByName: string | null;
  /** When onboarding was verified/completed; null until VERIFIED. */
  onboardedAt: string | null;
}

export interface OnboardingCounts {
  pending: number;
  linkSent: number;
  detailsSubmitted: number;
  verified: number;
}
export interface CreateEmployeeInput {
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  employeeCode: string;
  joiningDate: string;
  employmentType: EmploymentType;
  departmentId: number;
  designationId?: number | null;
  managerId?: number | null;
}

export interface UpdateEmployeeInput {
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  employeeCode: string;
  joiningDate: string;
  employmentType: EmploymentType;
  departmentId: number;
  designationId: number | null;
  managerId: number | null;
}

export interface UpdateEmployeeStatusInput {
  status: EmployeeStatus;
  exitDate: string | null;
}
export interface Department {
  id: number;
  name: string;
  parentDepartmentId: number | null;
  parentDepartmentName: string | null;
  headEmployeeId: number | null;
  managerName: string | null;
  managerEmail: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DepartmentInput {
  name: string;
  parentDepartmentId?: number | null;
  headEmployeeId?: number | null;
  managerId?: number | null;
}

export interface DepartmentManager {
  userId: number;
  userName: string;
  email: string;
}

export interface Designation {
  id: number;
  title: string;
  departmentId: number | null;
  departmentName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DesignationInput {
  title: string;
  departmentId?: number | null;
}

export interface PublicOnboardingForm {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  email: string;
  linkStatus: "PENDING" | "SENT" | "OPENED" | "SUBMITTED" | "EXPIRED";
  expiresAt: string;
}
export interface OnboardingLinkResponse {
  token: string;
  formUrl: string;
  expiresAt: string;
}

export interface ResendPasswordSetupResponse {
  setupUrl: string;
}

export interface EmployeeOnboardingView {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  email: string;
  onboardingStatus: OnboardingStatus;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianNumber: string | null;
  address: string | null;
  vehicleNumber: string | null;
  vehicleBrand: string | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  resumeUrl: string | null;
  aadhaarCardUrl: string | null;
  panCardUrl: string | null;
  experienceLetterUrl: string | null;
  bankPassbookUrl: string | null;
  passportPhotoUrl: string | null;
  marksheet10Url: string | null;
  marksheet12Url: string | null;
  marksheetGraduationUrl: string | null;
}

export interface ManualOnboardingInput {
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  guardianName: string;
  guardianRelation: string;
  guardianNumber: string;
  address: string;
  vehicleNumber: string;
  vehicleBrand: string;
  panNumber: string;
  aadhaarNumber: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  resume: File | null;
  aadhaarCard: File | null;
  panCard: File | null;
  experienceLetter: File | null;
  bankPassbook: File | null;
  passportPhoto: File | null;
  marksheet10: File | null;
  marksheet12: File | null;
  marksheetGraduation: File | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Result of POST /import/candidates. Uses the OLD envelope shape
 * ({ status, message, data, timestamp }) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â not HrApiEnvelope.
 */
export interface ImportResult {
  saved: number;
  skipped: number;
  errors: number;
  message: string;
}

/**
 * POST /add/candidate body. Source is free text on the backend (it accepts
 * canonical values like "linkedin" and one-offs like "College" alike), so
 * we type it as a plain string and just suggest known options in the UI.
 */
export interface NewCandidateInput {
  name: string;
  email: string;
  phone: string;
  source: string;
}

/**
 * PATCH /candidates/update-remark body. Backend takes a plain string and
 * stores it server-side as { text: "..." } ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â see RemarkCell for the
 * display-side normalization that handles both shapes plus legacy variants.
 */
export interface UpdateRemarkInput {
  id: number;
  remark: string;
}

export interface UpdateAdditionalInfoInput {
  id: number;
  city: string | null;
  experience: string | null;
  hasLaptop: boolean | null;
  education: string | null;
  term: string | null;
}

/**
 * POST /sendInterviewMail body. Matches backend MailDto exactly.
 */
export interface InterviewMailInput {
  to: string;
  subject: string;
  text: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "WORK_FROM_HOME" | "ON_LEAVE";

export interface AttendanceRecord {
  id: number | null;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  phone: string | null;
  departmentName: string | null;
  attendanceDate: string;
  status: AttendanceStatus | null;
  checkIn: string | null;
  checkOut: string | null;
  workingMinutes: number | null;
  hoursLogged: number | null;
  remarks: string | null;
  saved: boolean | null;
  markedById: number | null;
  markedByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  late: boolean;
  displayStatus: "NOT_CHECKED_IN" | "WORKING" | "LATE_WORKING" | "CHECKED_OUT" | "LATE";
  checkInStatus: string | null;
  checkOutStatus: string | null;
}

export interface AttendanceInput {
  employeeId: number;
  attendanceDate: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  remarks?: string | null;
}

export interface EmployeeAttendanceEmployee {
  id: number;
  employeeCode: string;
  name: string;
  departmentName: string | null;
  designationName: string | null;
  joiningDate: string;
}

export interface EmployeeAttendanceSummary {
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  workFromHomeCount: number;
  onLeaveCount: number;
  totalWorkingDays: number;
}

export interface EmployeeAttendanceMonthlyResponse {
  employee: EmployeeAttendanceEmployee;
  records: AttendanceRecord[];
  summary: EmployeeAttendanceSummary;
}
