export type WarningSeverity = "VERBAL" | "FIRST_WRITTEN" | "SECOND_WRITTEN" | "FINAL";

export type WarningCategory =
  | "ATTENDANCE"
  | "PERFORMANCE"
  | "MISCONDUCT"
  | "POLICY_VIOLATION"
  | "OTHER";

export type WarningStatus = "ISSUED" | "ACKNOWLEDGED" | "RESOLVED";

export interface EmployeeWarning {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeeDepartment?: string | null;
  issuedById?: number | null;
  issuedByName?: string | null;
  severity: WarningSeverity;
  category: WarningCategory;
  subject: string;
  description: string;
  actionRequired?: string | null;
  issuedDate: string;
  status: WarningStatus;
  acknowledgedAt?: string | null;
  employeeResponse?: string | null;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarningInput {
  employeeId: number | "";
  issuedById?: number | "";
  severity: WarningSeverity;
  category: WarningCategory;
  subject: string;
  description: string;
  actionRequired: string;
  issuedDate: string;
  sendEmail: boolean;
}

export interface WarningSummary {
  totalWarnings: number;
  issuedCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  finalWarningsCount: number;
}

export interface WarningListParams {
  page?: number;
  size?: number;
  severity?: WarningSeverity | "";
  category?: WarningCategory | "";
  status?: WarningStatus | "";
  employeeSearch?: string;
  sort?: string;
}
