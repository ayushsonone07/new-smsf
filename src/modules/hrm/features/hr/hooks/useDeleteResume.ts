import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

/**
 * Mutation: delete a candidate's resume.
 *
 * On success we invalidate the candidate list + search caches so the row's
 * `resumeUrl` refetches as null — which disables Download and brings the
 * Upload button back.
 */
export function useDeleteResume() {
  const qc = useQueryClient();

  return useMutation<string, Error, number>({
    mutationFn: (candidateId) => hrService.deleteResume(candidateId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "candidates"] });
      void qc.invalidateQueries({ queryKey: ["hr", "candidatesSearch"] });
    },
  });
}
