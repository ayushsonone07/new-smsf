import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { holidayService } from "../services";

import type { Holiday, HolidayInput, HolidayListParams } from "../types";

export const holidayKeys = {
  all: ["holidays"] as const,
  list: (params: HolidayListParams) => ["holidays", "list", params] as const,
  detail: (id: number) => ["holidays", "detail", id] as const,
};

export function useHolidays(params: HolidayListParams) {
  return useQuery({
    queryKey: holidayKeys.list(params),
    queryFn: () => holidayService.list(params),
  });
}

export function useHoliday(id: number) {
  return useQuery({
    queryKey: holidayKeys.detail(id),
    queryFn: () => holidayService.get(id),
    enabled: id > 0,
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation<Holiday, Error, HolidayInput>({
    mutationFn: (input) => holidayService.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: holidayKeys.all }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation<Holiday, Error, { id: number; input: HolidayInput }>({
    mutationFn: ({ id, input }) => holidayService.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: holidayKeys.all }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => holidayService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: holidayKeys.all }),
  });
}