import type { HrApiEnvelope, PaginationMeta } from "@shared/types";
import { HrApiException, hrApiGet, hrApiGetPaged, http } from "@shared/services";

import { RESIGNATIONS_ENDPOINT_BUILDERS, RESIGNATIONS_ENDPOINTS } from "./endpoints";
import type {
  EmployeeResignation,
  ResignationApproveInput,
  ResignationClearanceInput,
  ResignationListParams,
  ResignationSubmitInput,
  ResignationSummary,
} from "../types";

function queryString(params: ResignationListParams): string {
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

export const resignationsService = {
  async list(params: ResignationListParams): Promise<{ data: EmployeeResignation[]; meta: PaginationMeta }> {
    return hrApiGetPaged<EmployeeResignation[]>(RESIGNATIONS_ENDPOINTS.resignations + queryString(params));
  },

  async summary(): Promise<ResignationSummary> {
    return hrApiGet<ResignationSummary>(RESIGNATIONS_ENDPOINTS.summary);
  },

  async myResignations(): Promise<EmployeeResignation[]> {
    return hrApiGet<EmployeeResignation[]>(RESIGNATIONS_ENDPOINTS.myResignations);
  },

  async submit(input: ResignationSubmitInput): Promise<EmployeeResignation> {
    const { data } = await http.post<HrApiEnvelope<EmployeeResignation>>(
      RESIGNATIONS_ENDPOINTS.resignations,
      input,
    );
    return unwrap(data);
  },

  async approve(id: number, input: ResignationApproveInput): Promise<EmployeeResignation> {
    const { data } = await http.post<HrApiEnvelope<EmployeeResignation>>(
      RESIGNATIONS_ENDPOINT_BUILDERS.approve(id),
      input,
    );
    return unwrap(data);
  },

  async reject(id: number, rejectionReason: string): Promise<EmployeeResignation> {
    const { data } = await http.post<HrApiEnvelope<EmployeeResignation>>(
      RESIGNATIONS_ENDPOINT_BUILDERS.reject(id),
      { rejectionReason },
    );
    return unwrap(data);
  },

  async withdraw(id: number, withdrawalReason?: string): Promise<EmployeeResignation> {
    const { data } = await http.post<HrApiEnvelope<EmployeeResignation>>(
      RESIGNATIONS_ENDPOINT_BUILDERS.withdraw(id),
      { withdrawalReason },
    );
    return unwrap(data);
  },

  async updateClearance(id: number, input: ResignationClearanceInput): Promise<EmployeeResignation> {
    const { data } = await http.patch<HrApiEnvelope<EmployeeResignation>>(
      RESIGNATIONS_ENDPOINT_BUILDERS.clearance(id),
      input,
    );
    return unwrap(data);
  },

  async completeExit(id: number): Promise<EmployeeResignation> {
    const { data } = await http.post<HrApiEnvelope<EmployeeResignation>>(
      RESIGNATIONS_ENDPOINT_BUILDERS.complete(id),
      {},
    );
    return unwrap(data);
  },
};
