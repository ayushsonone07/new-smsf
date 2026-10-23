import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

import type { Candidate } from "../types";

export function useRequestHiringApproval() {
  const qc = useQueryClient();

  return useMutation<Candidate, Error, number>({
    mutationFn: (candidateId) => hrService.requestHiringApproval(candidateId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "candidates"] });
      void qc.invalidateQueries({ queryKey: ["hr", "candidatesSearch"] });
      void qc.invalidateQueries({ queryKey: ["hr", "kpis"] });
    },
  });
}
