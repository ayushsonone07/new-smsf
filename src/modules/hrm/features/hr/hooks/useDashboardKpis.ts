import { useQuery } from "@tanstack/react-query";

import { hrService } from "../services";

import type { DateRange } from "../types";

/** Fetches KPI tile data. Fires on mount; refetches when the date range changes. */
export function useDashboardKpis(range?: DateRange) {
  return useQuery({
    queryKey: ["hr", "kpis", range?.from?.toISOString() ?? null, range?.to?.toISOString() ?? null],
    queryFn: () => hrService.getKpis(range),
  });
}
