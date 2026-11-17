import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { policyService } from "../services";
import type {
  CompanyPolicy,
  PolicyAcceptanceInput,
  PolicyAcknowledgmentsSummary,
  PolicyStatus,
} from "../types";

export const policyKeys = {
  all: ["policy"] as const,
  current: ["policy", "current"] as const,
  myStatus: ["policy", "myStatus"] as const,
  acknowledgments: ["policy", "acknowledgments"] as const,
};

export function useCurrentPolicy(enabled = true) {
  return useQuery<CompanyPolicy, Error>({
    queryKey: policyKeys.current,
    queryFn: () => policyService.getCurrentPolicy(),
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useMyPolicyStatus(enabled = true) {
  return useQuery<PolicyStatus, Error>({
    queryKey: policyKeys.myStatus,
    queryFn: () => policyService.getMyStatus(),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePolicyAcknowledgments(enabled = true) {
  return useQuery<PolicyAcknowledgmentsSummary, Error>({
    queryKey: policyKeys.acknowledgments,
    queryFn: () => policyService.getAcknowledgments(),
    enabled,
  });
}

export function useAcceptPolicy() {
  const qc = useQueryClient();
  return useMutation<PolicyStatus, Error, PolicyAcceptanceInput>({
    mutationFn: (input) => policyService.acceptPolicy(input),
    onSuccess: (data) => {
      qc.setQueryData(policyKeys.myStatus, data);
      void qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}
