import { useMutation } from "@tanstack/react-query";

import { hrService } from "../services";

import type { InterviewMailInput } from "../types";

/**
 * Mutation: send an interview mail to a candidate.
 */
export function useSendInterviewMail() {
  return useMutation<string, Error, InterviewMailInput>({
    mutationFn: (input) => hrService.sendInterviewMail(input),
  });
}
