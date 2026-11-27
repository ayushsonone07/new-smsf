import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { HrApiException, hrApiGet, hrApiGetPaged, http } from "@shared/services";

import { WARNINGS_ENDPOINT_BUILDERS, WARNINGS_ENDPOINTS } from "./endpoints";
import type {
  EmployeeWarning,
  WarningInput,
  WarningListParams,
  WarningStatus,
  WarningSummary,
} from "../types";

function queryString(params: WarningListParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
}

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === null) {
    throw new HrApiException(envelope.error ?? { code: "UNKNOWN", message: "Unknown error" });
  }
  return envelope.data;
}

export const warningsService = {
  async list(params: WarningListParams): Promise<{ data: EmployeeWarning[]; meta: PaginationMeta }> {
    return hrApiGetPaged<EmployeeWarning[]>(WARNINGS_ENDPOINTS.warnings + queryString(params));
  },

  async summary(): Promise<WarningSummary> {
    return hrApiGet<WarningSummary>(WARNINGS_ENDPOINTS.summary);
  },

  async myWarnings(): Promise<EmployeeWarning[]> {
    return hrApiGet<EmployeeWarning[]>(WARNINGS_ENDPOINTS.myWarnings);
  },

  async countForEmployee(employeeId: number): Promise<number> {
    return hrApiGet<number>(WARNINGS_ENDPOINT_BUILDERS.employeeCount(employeeId));
  },

  async create(input: WarningInput): Promise<EmployeeWarning> {
    const { data } = await http.post<HrApiEnvelope<EmployeeWarning>>(WARNINGS_ENDPOINTS.warnings, input);
    return unwrap(data);
  },

  async acknowledge(id: number, employeeResponse?: string): Promise<EmployeeWarning> {
    const { data } = await http.post<HrApiEnvelope<EmployeeWarning>>(
      WARNINGS_ENDPOINT_BUILDERS.acknowledge(id),
      { employeeResponse },
    );
    return unwrap(data);
  },

  async updateStatus(id: number, status: WarningStatus): Promise<EmployeeWarning> {
    const { data } = await http.patch<HrApiEnvelope<EmployeeWarning>>(
      WARNINGS_ENDPOINT_BUILDERS.status(id),
      { status },
    );
    return unwrap(data);
  },

  async delete(id: number): Promise<void> {
    await http.delete(WARNINGS_ENDPOINT_BUILDERS.warning(id));
  },
};
