import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

import type { Candidate } from "../types";

export interface ManualHiringApprovalInput {
  candidateId: number;
  password: string;
}

export function useManualHiringApproval() {
  const qc = useQueryClient();

  return useMutation<Candidate, Error, ManualHiringApprovalInput>({
    mutationFn: ({ candidateId, password }) =>
      hrService.manualHiringApproval(candidateId, password),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "candidates"] });
      void qc.invalidateQueries({ queryKey: ["hr", "candidatesSearch"] });
      void qc.invalidateQueries({ queryKey: ["hr", "kpis"] });
    },
  });
}
