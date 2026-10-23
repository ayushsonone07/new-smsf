import { hrApiGetPaged } from "@shared/services";
import type { PaginationMeta } from "@shared/types";

import { AUDIT_LOG_ENDPOINTS } from "./endpoints";

import type { AuditLogListParams, AuditLogPage, AuditLogRecord } from "../types";

function queryString(params: AuditLogListParams): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")
  );
}

export const auditLogService = {
  async list(
    params: AuditLogListParams,
  ): Promise<{ items: AuditLogRecord[]; meta: PaginationMeta }> {
    const { data, meta } = await hrApiGetPaged<AuditLogPage>(
      AUDIT_LOG_ENDPOINTS.auditLogs + queryString(params),
    );
    return { items: data?.content ?? [], meta };
  },
};