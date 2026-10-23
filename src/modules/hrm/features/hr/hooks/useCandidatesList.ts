import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { hrService, type CandidatesListParams } from "../services";

/**
 * Fetches a paginated, filterable candidate list.
 * `keepPreviousData` so page switches don't flash a loading state.
 */
export function useCandidatesList(params: CandidatesListParams) {
  return useQuery({
    queryKey: [
      "hr",
      "candidates",
      params.range?.from?.toISOString() ?? null,
      params.range?.to?.toISOString() ?? null,
      params.source ?? null,
      params.status ?? null,
      params.page,
      params.size,
      params.sort ?? null,
    ],
    queryFn: () => hrService.listCandidates(params),
    placeholderData: keepPreviousData,
  });
}
