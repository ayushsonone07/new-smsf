import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import type { PaginationMeta } from "@shared/types";

import { hrService } from "../services";

import type { Candidate, CandidateStatus } from "../types";

interface UpdateVars {
  id: number;
  status: CandidateStatus;
}

interface ListPage {
  items: Candidate[];
  meta: PaginationMeta;
}
type ListSnapshot = [QueryKey, ListPage | undefined][];

/**
 * Mutation: change a candidate's status.
 *
 * Optimistic: every cached candidate list / search query is patched immediately
 * so the dropdown change shows up instantly. If the backend rejects, we roll
 * back to the snapshot. After settle (success or failure) we invalidate the
 * whole HR namespace so KPIs and counts reconcile.
 */
export function useUpdateCandidateStatus() {
  const qc = useQueryClient();

  return useMutation<string, Error, UpdateVars, { snapshot: ListSnapshot }>({
    mutationFn: ({ id, status }) => hrService.updateCandidateStatus(id, status),

    onMutate: async ({ id, status }) => {
      // Cancel any in-flight list refetches so our optimistic write isn't overwritten.
      await qc.cancelQueries({ queryKey: ["hr", "candidates"] });
      await qc.cancelQueries({ queryKey: ["hr", "candidatesSearch"] });

      // Snapshot both list + search caches so a rollback restores everything.
      const snapshot: ListSnapshot = [
        ...qc.getQueriesData<ListPage>({ queryKey: ["hr", "candidates"] }),
        ...qc.getQueriesData<ListPage>({ queryKey: ["hr", "candidatesSearch"] }),
      ];

      // Patch the candidate inside every matching page.
      const updater = (old: ListPage | undefined): ListPage | undefined => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((c) => (c.id === id ? { ...c, status } : c)),
        };
      };
      qc.setQueriesData<ListPage>({ queryKey: ["hr", "candidates"] }, updater);
      qc.setQueriesData<ListPage>({ queryKey: ["hr", "candidatesSearch"] }, updater);

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      // Restore each cached page exactly as it was before the optimistic write.
      context?.snapshot.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },

    onSettled: () => {
      // Only KPIs need a server round-trip — counts shift with each status
      // change. The list/search caches are already correct via the optimistic
      // write; charts don't depend on status. Full reconciliation happens when
      // the user hits Refresh or reloads.
      void qc.invalidateQueries({ queryKey: ["hr", "kpis"] });
    },
  });
}
