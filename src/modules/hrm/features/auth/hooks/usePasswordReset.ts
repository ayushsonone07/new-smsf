import { useMutation } from "@tanstack/react-query";

import { authService } from "../services";
import type { ResetPasswordRequest } from "../types";

export function usePasswordReset() {
  const forgotPassword = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });

  const resetPassword = useMutation({
    mutationFn: (payload: ResetPasswordRequest) =>
      authService.resetPassword(payload),
  });

  return { forgotPassword, resetPassword };
}
