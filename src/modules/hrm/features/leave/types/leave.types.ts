export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type LeaveTypeValue =
  | "CASUAL"
  | "SICK"
  | "PAID"
  | "UNPAID";

export interface LeaveTypeInfo {
  type: LeaveTypeValue;
  label: string;
  description: string;
  icon: string;
}

export interface LeaveBalance {
  leaveType: LeaveTypeValue;
  label: string;
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeeDepartment?: string;
  leaveType: LeaveTypeValue;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  halfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  reviewerNote?: string;
}

export interface LeaveRequestInput {
  leaveType: LeaveTypeValue;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason: string;
}

export interface LeaveApprovalInput {
  id: number;
  action: "APPROVE" | "REJECT";
  note?: string;
  rejectionReason?: string;
}

export interface LeaveSummary {
  pending: number;
  approvedThisMonth: number;
  onLeaveToday: number;
  rejectedThisMonth: number;
}

export interface LeaveStatusDistribution {
  status: string;
  count: number;
}

export interface LeaveListParams {
  page?: number;
  size?: number;
  status?: LeaveStatus;
  leaveType?: LeaveTypeValue;
  employeeSearch?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  scope?: "self" | "accessible";
}

export interface LeaveEntitlement {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  leaveType: LeaveTypeValue;
  totalDays: number;
  year: number;
}

export interface LeaveEntitlementInput {
  employeeId?: number | null;
  leaveType: LeaveTypeValue;
  totalDays: number;
  year: number;
}

export interface LeavePolicyItem {
  leaveType: LeaveTypeValue;
  defaultDays: number;
  description?: string;
}

export interface LeaveContext {
  workingDays: string[];
  holidays: string[];
}
