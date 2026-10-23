import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@shared/hooks";

import { hrService, type CandidatesListParams } from "../services";

/**
 * Search with a 300ms debounce on the input. Guards against q < 2 chars
 * (backend would reject with SEARCH_TERM_TOO_SHORT anyway).
 */
export function useCandidatesSearch(
  q: string,
  page: number,
  size: number,
  filters: Pick<CandidatesListParams, "source" | "status" | "range">,
) {
  const debouncedQ = useDebouncedValue(q.trim(), 300);
  const enabled = debouncedQ.length >= 2;

  return useQuery({
    queryKey: [
      "hr",
      "candidatesSearch",
      debouncedQ,
      page,
      size,
      filters.source,
      filters.status,
      filters.range?.from?.toISOString(),
      filters.range?.to?.toISOString(),
    ],
    queryFn: () => hrService.searchCandidates(debouncedQ, page, size, filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}
