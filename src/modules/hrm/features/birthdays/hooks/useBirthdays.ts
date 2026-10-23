import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { birthdayService } from "../services/birthdayService";
import type { BirthdayRequest } from "../types/birthday.types";

export const birthdayKeys = {
  all: ["birthdays"] as const,
  today: ["birthdays", "today"] as const,
  upcoming: (days: number) => ["birthdays", "upcoming", days] as const,
};

export function useBirthdaysToday() {
  return useQuery({
    queryKey: birthdayKeys.today,
    queryFn: () => birthdayService.getTodayBirthdays(),
  });
}

export function useUpcomingBirthdays(days: number = 30) {
  return useQuery({
    queryKey: birthdayKeys.upcoming(days),
    queryFn: () => birthdayService.getUpcomingBirthdays(days),
  });
}

export function useSaveBirthday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BirthdayRequest) => birthdayService.saveBirthday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: birthdayKeys.all });
    },
  });
}
