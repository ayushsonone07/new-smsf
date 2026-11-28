export type ResignationReason =
  | "BETTER_OPPORTUNITY"
  | "PERSONAL"
  | "RELOCATION"
  | "HEALTH"
  | "HIGHER_STUDIES"
  | "COMPENSATION"
  | "OTHER";

export type ResignationStatus =
  | "SUBMITTED"
  | "NOTICE_PERIOD"
  | "COMPLETED"
  | "REJECTED"
  | "WITHDRAWN";

export interface EmployeeResignation {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeeDepartment?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  reasonCategory: ResignationReason;
  reasonDetails: string;
  resignationDate: string;
  requestedLastWorkingDay: string;
  approvedLastWorkingDay?: string | null;
  noticePeriodDays: number;
  status: ResignationStatus;
  hrRemarks?: string | null;
  rejectionReason?: string | null;
  withdrawalReason?: string | null;
  assetCleared: boolean;
  handoverCleared: boolean;
  accessRevoked: boolean;
  fnfSettled: boolean;
  emailSent: boolean;
  reviewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResignationSubmitInput {
  reasonCategory: ResignationReason;
  reasonDetails: string;
  resignationDate?: string;
  requestedLastWorkingDay?: string;
  noticePeriodDays?: number;
}

export interface ResignationApproveInput {
  approvedLastWorkingDay?: string;
  hrRemarks?: string;
  sendEmail?: boolean;
}

export interface ResignationClearanceInput {
  assetCleared?: boolean;
  handoverCleared?: boolean;
  accessRevoked?: boolean;
  fnfSettled?: boolean;
}

export interface ResignationSummary {
  totalResignations: number;
  submittedCount: number;
  noticePeriodCount: number;
  completedCount: number;
  pendingClearanceCount: number;
}

export interface ResignationListParams {
  page?: number;
  size?: number;
  reasonCategory?: ResignationReason | "";
  status?: ResignationStatus | "";
  search?: string;
  sort?: string;
}
