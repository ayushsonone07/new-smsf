import { useQuery } from "@tanstack/react-query";

import { hrService } from "../services";

interface RecruitmentStageCounts {
  applied: number;
  screened: number;
}

async function fetchRecruitmentStageCounts(): Promise<RecruitmentStageCounts> {
  const [appliedResult, screenedResult] = await Promise.all([
    hrService.listCandidates({ page: 0, size: 1, status: "NEW" }),
    hrService.listCandidates({ page: 0, size: 1, status: "SHORTLISTED" }),
  ]);

  return {
    applied: appliedResult.meta.totalElements,
    screened: screenedResult.meta.totalElements,
  };
}

export function useRecruitmentStageCounts() {
  return useQuery<RecruitmentStageCounts, Error>({
    queryKey: ["hr", "recruitment-stage-counts"],
    queryFn: fetchRecruitmentStageCounts,
  });
}
