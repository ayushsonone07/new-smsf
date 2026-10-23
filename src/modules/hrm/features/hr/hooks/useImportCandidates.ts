import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

import type { ImportResult } from "../types";

/**
 * Mutation: upload a CSV/Excel file to /import/candidates.
 * On success: invalidates the candidates list + KPIs + charts queries so the UI
 * picks up the freshly imported rows.
 */
export function useImportCandidates() {
  const qc = useQueryClient();

  return useMutation<ImportResult, Error, File>({
    mutationFn: (file) => hrService.importCandidates(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hr"] });
    },
  });
}
