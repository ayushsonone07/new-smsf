import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import type { PaginationMeta } from "@shared/types";

import { hrService } from "../services";

import type { Candidate, UpdateRemarkInput } from "../types";

interface ListPage {
  items: Candidate[];
  meta: PaginationMeta;
}
type ListSnapshot = [QueryKey, ListPage | undefined][];

/**
 * Mutation: set or replace a candidate's remark.
 *
 * Optimistic: every cached candidate list / search query is patched to the
 * { text: <remark> } shape the backend stores. Rolls back from a snapshot on
 * failure. After settle (success or failure) we invalidate the whole HR
 * namespace so KPIs (withRemarksPct) reconcile.
 */
export function useUpdateCandidateRemark() {
  const qc = useQueryClient();

  return useMutation<string, Error, UpdateRemarkInput, { snapshot: ListSnapshot }>({
    mutationFn: (input) => hrService.updateCandidateRemark(input),

    onMutate: async ({ id, remark }) => {
      // Stop any list refetches that would clobber the optimistic write.
      await qc.cancelQueries({ queryKey: ["hr", "candidates"] });
      await qc.cancelQueries({ queryKey: ["hr", "candidatesSearch"] });

      // Snapshot list + search caches so we can restore exactly on failure.
      const snapshot: ListSnapshot = [
        ...qc.getQueriesData<ListPage>({ queryKey: ["hr", "candidates"] }),
        ...qc.getQueriesData<ListPage>({ queryKey: ["hr", "candidatesSearch"] }),
      ];

      // Patch the candidate in every cached page. We write the same shape the
      // backend stores ({ text: "..." }) so the display layer treats the
      // optimistic value identically to the eventual server truth.
      const nextRemark = { text: remark };
      const updater = (old: ListPage | undefined): ListPage | undefined => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((c) => (c.id === id ? { ...c, remark: nextRemark } : c)),
        };
      };
      qc.setQueriesData<ListPage>({ queryKey: ["hr", "candidates"] }, updater);
      qc.setQueriesData<ListPage>({ queryKey: ["hr", "candidatesSearch"] }, updater);

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },

    onSettled: () => {
      // Only KPIs need a server round-trip — withRemarksPct shifts when a
      // candidate gains a remark. The list/search caches are already correct
      // via the optimistic write; charts don't depend on remarks. Full
      // reconciliation happens when the user hits Refresh or reloads.
      void qc.invalidateQueries({ queryKey: ["hr", "kpis"] });
    },
  });
}
