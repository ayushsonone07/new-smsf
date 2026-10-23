import { useQuery } from "@tanstack/react-query";

import { hrService } from "../services";

import type { DateRange } from "../types";

/** Fetches all chart datasets in one call. Parallel-safe with useDashboardKpis. */
export function useDashboardCharts(range?: DateRange) {
  return useQuery({
    queryKey: [
      "hr",
      "charts",
      range?.from?.toISOString() ?? null,
      range?.to?.toISOString() ?? null,
    ],
    queryFn: () => hrService.getCharts(range),
  });
}
