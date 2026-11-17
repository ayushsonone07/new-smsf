import type { HrApiEnvelope } from "@shared/types";
import { HrApiException, hrApiGet, http } from "@shared/services";
import { POLICY_ENDPOINTS } from "./endpoints";
import type {
  CompanyPolicy,
  PolicyAcceptanceInput,
  PolicyAcknowledgmentsSummary,
  PolicyStatus,
} from "../types";

function unwrap<T>(envelope: HrApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === null) {
    throw new HrApiException(envelope.error ?? { code: "UNKNOWN", message: "Unknown error" });
  }
  return envelope.data;
}

export const policyService = {
  async getCurrentPolicy(): Promise<CompanyPolicy> {
    return hrApiGet<CompanyPolicy>(POLICY_ENDPOINTS.current);
  },

  async getMyStatus(): Promise<PolicyStatus> {
    return hrApiGet<PolicyStatus>(POLICY_ENDPOINTS.myStatus);
  },

  async acceptPolicy(input: PolicyAcceptanceInput): Promise<PolicyStatus> {
    const { data } = await http.post<HrApiEnvelope<PolicyStatus>>(POLICY_ENDPOINTS.accept, input);
    return unwrap(data);
  },

  async getAcknowledgments(): Promise<PolicyAcknowledgmentsSummary> {
    return hrApiGet<PolicyAcknowledgmentsSummary>("/api/v1/policies/acknowledgments");
  },
};
