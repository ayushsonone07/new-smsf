import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { auditLogService } from "../services";

import type { AuditLogListParams } from "../types";

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (params: AuditLogListParams) => ["audit-logs", "list", params] as const,
};

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => auditLogService.list(params),
    placeholderData: keepPreviousData,
  });
}