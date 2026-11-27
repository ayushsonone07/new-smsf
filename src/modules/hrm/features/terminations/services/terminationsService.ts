import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { HrApiException, hrApiGet, hrApiGetPaged, http } from "@shared/services";

import { TERMINATIONS_ENDPOINT_BUILDERS, TERMINATIONS_ENDPOINTS } from "./endpoints";
import type {
  EmployeeTermination,
  TerminationClearanceInput,
  TerminationInput,
  TerminationListParams,
  TerminationPrecheck,
  TerminationSummary,
} from "../types";

function queryString(params: TerminationListParams): string {
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

export const terminationsService = {
  async list(params: TerminationListParams): Promise<{ data: EmployeeTermination[]; meta: PaginationMeta }> {
    return hrApiGetPaged<EmployeeTermination[]>(TERMINATIONS_ENDPOINTS.terminations + queryString(params));
  },

  async summary(): Promise<TerminationSummary> {
    return hrApiGet<TerminationSummary>(TERMINATIONS_ENDPOINTS.summary);
  },

  async precheck(employeeId: number): Promise<TerminationPrecheck> {
    return hrApiGet<TerminationPrecheck>(TERMINATIONS_ENDPOINT_BUILDERS.precheck(employeeId));
  },

  async create(input: TerminationInput): Promise<EmployeeTermination> {
    const { data } = await http.post<HrApiEnvelope<EmployeeTermination>>(
      TERMINATIONS_ENDPOINTS.terminations,
      input,
    );
    return unwrap(data);
  },

  async updateClearance(id: number, input: TerminationClearanceInput): Promise<EmployeeTermination> {
    const { data } = await http.patch<HrApiEnvelope<EmployeeTermination>>(
      TERMINATIONS_ENDPOINT_BUILDERS.clearance(id),
      input,
    );
    return unwrap(data);
  },

  async revoke(id: number, revokedReason: string): Promise<EmployeeTermination> {
    const { data } = await http.post<HrApiEnvelope<EmployeeTermination>>(
      TERMINATIONS_ENDPOINT_BUILDERS.revoke(id),
      { revokedReason },
    );
    return unwrap(data);
  },
};
