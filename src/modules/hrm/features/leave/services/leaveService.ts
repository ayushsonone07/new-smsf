import { hrApiGet, hrApiGetPaged, hrApiPost, hrApiPut, hrApiDelete } from "@shared/services";
import type { PaginationMeta } from "@shared/types";

import { LEAVE_ENDPOINT_BUILDERS, LEAVE_ENDPOINTS } from "./endpoints";

import type {
  LeaveApprovalInput,
  LeaveBalance,
  LeaveContext,
  LeaveEntitlement,
  LeaveEntitlementInput,
  LeavePolicyItem,
  LeaveRequest,
  LeaveRequestInput,
  LeaveStatusDistribution,
  LeaveSummary,
  LeaveTypeInfo,
} from "../types";

function queryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return (
    "?" +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
  );
}

export const leaveService = {
  async listRequests(params: {
    page?: number;
    size?: number;
    status?: string;
    leaveType?: string;
    employeeSearch?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    scope?: "self" | "accessible";
  }): Promise<{ data: LeaveRequest[]; meta: PaginationMeta }> {
    return hrApiGetPaged<LeaveRequest[]>(LEAVE_ENDPOINTS.requests + queryString(params));
  },

  async getRequest(id: number): Promise<LeaveRequest> {
    return hrApiGet<LeaveRequest>(LEAVE_ENDPOINT_BUILDERS.request(id));
  },

  async getBalances(): Promise<LeaveBalance[]> {
    return hrApiGet<LeaveBalance[]>(LEAVE_ENDPOINTS.balances);
  },

  async getLeaveTypes(): Promise<LeaveTypeInfo[]> {
    return hrApiGet<LeaveTypeInfo[]>(LEAVE_ENDPOINTS.types);
  },

  async getContext(): Promise<LeaveContext> {
    return hrApiGet<LeaveContext>(LEAVE_ENDPOINTS.context);
  },

  async getSummary(): Promise<LeaveSummary> {
    return hrApiGet<LeaveSummary>(LEAVE_ENDPOINTS.summary);
  },

  async getWeeklyLeaveStatus(startDate: string, endDate: string): Promise<LeaveStatusDistribution[]> {
    return hrApiGet<LeaveStatusDistribution[]>(LEAVE_ENDPOINTS.weeklyStatus + queryString({ startDate, endDate }));
  },

  async applyLeave(input: LeaveRequestInput): Promise<LeaveRequest> {
    return hrApiPost<LeaveRequest>(LEAVE_ENDPOINTS.requests, input);
  },

  async approveLeave(input: LeaveApprovalInput): Promise<LeaveRequest> {
    return hrApiPost<LeaveRequest>(LEAVE_ENDPOINT_BUILDERS.approve(input.id), {
      note: input.note,
    });
  },

  async rejectLeave(input: LeaveApprovalInput): Promise<LeaveRequest> {
    return hrApiPost<LeaveRequest>(LEAVE_ENDPOINT_BUILDERS.reject(input.id), {
      rejectionReason: input.rejectionReason,
    });
  },

  async cancelLeave(id: number): Promise<void> {
    await hrApiPost<void>(LEAVE_ENDPOINT_BUILDERS.cancel(id));
  },

  async listEntitlements(params?: {
    employeeId?: number;
    year?: number;
    leaveType?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ data: LeaveEntitlement[]; meta: PaginationMeta }> {
    const query = params ? queryString(params) : "";
    return hrApiGetPaged<LeaveEntitlement[]>(LEAVE_ENDPOINTS.entitlements + query);
  },

  async setEntitlement(input: LeaveEntitlementInput): Promise<LeaveEntitlement> {
    return hrApiPost<LeaveEntitlement>(LEAVE_ENDPOINTS.entitlements, input);
  },

  async deleteEntitlement(id: number): Promise<void> {
    await hrApiDelete(LEAVE_ENDPOINT_BUILDERS.entitlement(id));
  },

  async getLeavePolicies(): Promise<LeavePolicyItem[]> {
    return hrApiGet<LeavePolicyItem[]>(LEAVE_ENDPOINTS.policy);
  },

  async updateLeavePolicies(policies: LeavePolicyItem[]): Promise<LeavePolicyItem[]> {
    return hrApiPut<LeavePolicyItem[]>(LEAVE_ENDPOINTS.policy, { policies });
  },

  async syncPolicyToAllEmployees(year?: number): Promise<{ message: string; count: number }> {
    const query = year ? queryString({ year }) : "";
    return hrApiPost<{ message: string; count: number }>(LEAVE_ENDPOINTS.policySyncAll + query);
  },
};
