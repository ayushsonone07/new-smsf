import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

import type { Candidate, UpdateAdditionalInfoInput } from "../types";

export function useUpdateCandidateAdditionalInfo() {
  const qc = useQueryClient();

  return useMutation<Candidate, Error, UpdateAdditionalInfoInput>({
    mutationFn: (input) => hrService.updateCandidateAdditionalInfo(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "candidates"] });
      void qc.invalidateQueries({ queryKey: ["hr", "candidatesSearch"] });
    },
  });
}
