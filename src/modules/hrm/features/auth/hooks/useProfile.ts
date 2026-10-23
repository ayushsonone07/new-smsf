import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppDispatch } from "@app/store";

import { authService } from "../services";
import { updateAuthUser } from "../store";

import type { EmployeeProfile, UpdateProfileInput } from "../types";

export const profileKeys = {
  all: ["profile"] as const,
};

export function useMyProfile() {
  return useQuery<EmployeeProfile, Error>({
    queryKey: profileKeys.all,
    queryFn: () => authService.getMyProfile(),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation<EmployeeProfile, Error, UpdateProfileInput>({
    mutationFn: (input) => authService.updateMyProfile(input),
    onSuccess: (profile) => {
      qc.setQueryData(profileKeys.all, profile);
      dispatch(updateAuthUser({ name: profile.name, email: profile.email }));
    },
  });
}
