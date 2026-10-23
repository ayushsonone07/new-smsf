import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

interface UploadVars {
  candidateId: number;
  file: File;
}

/**
 * Mutation: upload a resume for a candidate.
 *
 * On success we invalidate the candidate list + search caches so the row's
 * `resumeUrl` is refetched — which flips the Download button from disabled to
 * enabled. No optimistic update: we want the server-confirmed URL before
 * letting the user download.
 */
export function useUploadResume() {
  const qc = useQueryClient();

  return useMutation<string, Error, UploadVars>({
    mutationFn: ({ candidateId, file }) => hrService.uploadResume(candidateId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr", "candidates"] });
      void qc.invalidateQueries({ queryKey: ["hr", "candidatesSearch"] });
    },
  });
}
