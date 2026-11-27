export type TerminationType =
  | "CAUSE_MISCONDUCT"
  | "PERFORMANCE"
  | "REDUNDANCY"
  | "PROBATION_END"
  | "ABSCONDING"
  | "OTHER";

export type TerminationStatus = "SCHEDULED" | "COMPLETED" | "REVOKED";

export interface EmployeeTermination {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeeDepartment?: string | null;
  terminatedById?: number | null;
  terminatedByName?: string | null;
  terminationType: TerminationType;
  reason: string;
  detailedNotes?: string | null;
  terminationDate: string;
  lastWorkingDay: string;
  status: TerminationStatus;
  eligibleForRehire: boolean;
  assetCleared: boolean;
  accessRevoked: boolean;
  fnfSettled: boolean;
  emailSent: boolean;
  revokedByName?: string | null;
  revokedReason?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TerminationInput {
  employeeId: number | "";
  terminatedById?: number | "";
  terminationType: TerminationType;
  reason: string;
  detailedNotes: string;
  terminationDate: string;
  lastWorkingDay: string;
  eligibleForRehire: boolean;
  disableLogin: boolean;
  sendEmail: boolean;
}

export interface TerminationClearanceInput {
  assetCleared?: boolean;
  accessRevoked?: boolean;
  fnfSettled?: boolean;
}

export interface TerminationPrecheck {
  employeeId: number;
  priorWarningsCount: number;
  alreadyTerminated: boolean;
  assignedAssets: Array<{
    id: number;
    assetType: string;
    assetName: string;
    identifier: string;
  }>;
}

export interface TerminationSummary {
  totalTerminations: number;
  completedCount: number;
  scheduledCount: number;
  pendingClearanceCount: number;
  revokedCount: number;
}

export interface TerminationListParams {
  page?: number;
  size?: number;
  terminationType?: TerminationType | "";
  status?: TerminationStatus | "";
  search?: string;
  sort?: string;
}
