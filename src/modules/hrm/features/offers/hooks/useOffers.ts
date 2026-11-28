import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { offersService } from "../services";
import type { OfferLetterInput, OfferLetterListParams, OfferStatus } from "../types";

export const offersQueryKeys = {
  all: ["offers"] as const,
  list: (params: OfferLetterListParams) => ["offers", "list", params] as const,
  my: ["offers", "my"] as const,
  summary: ["offers", "summary"] as const,
};

export function useOfferLetters(params: OfferLetterListParams, enabled = true) {
  return useQuery({
    queryKey: offersQueryKeys.list(params),
    queryFn: () => offersService.list(params),
    enabled,
  });
}

export function useMyOfferLetters(enabled = true) {
  return useQuery({
    queryKey: offersQueryKeys.my,
    queryFn: () => offersService.myOffers(),
    enabled,
  });
}

export function useOfferLetterSummary(enabled = true) {
  return useQuery({
    queryKey: offersQueryKeys.summary,
    queryFn: () => offersService.summary(),
    enabled,
  });
}

export function useCreateOfferLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OfferLetterInput) => offersService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offersQueryKeys.all });
    },
  });
}

export function useUpdateOfferStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OfferStatus }) =>
      offersService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offersQueryKeys.all });
    },
  });
}

export function useDeleteOfferLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => offersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offersQueryKeys.all });
    },
  });
}
