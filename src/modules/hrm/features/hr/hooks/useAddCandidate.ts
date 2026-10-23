import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

import type { NewCandidateInput } from "../types";

/**
 * Mutation: POST /add/candidate. Returns the success message from the server.
 * On success: invalidates everything under ["hr", ...] so KPIs / charts / list
 * pick up the new candidate without a hard refresh.
 */
export function useAddCandidate() {
  const qc = useQueryClient();

  return useMutation<string, Error, NewCandidateInput>({
    mutationFn: (input) => hrService.addCandidate(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr"] });
    },
  });
}
