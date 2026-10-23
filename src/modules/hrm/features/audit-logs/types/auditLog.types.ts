export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "FAILED_LOGIN"
  | "PASSWORD_CHANGE"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "APPLY_LEAVE"
  | "APPROVE"
  | "REJECT"
  | "CANCEL"
  | "CHANGE_ROLE"
  | "CHANGE_PERMISSION"
  | "GENERATE"
  | "PROCESS"
  | "PAY"
  | "EXPORT";

export interface AuditLogRecord {
  id: number;
  userId?: number | null;
  username?: string | null;
  role?: string | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  success: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLogListParams {
  userId?: number | "";
  username?: string;
  action?: AuditAction | "";
  entityType?: string;
  success?: boolean | "";
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/** Spring Data Page shape returned inside the envelope's `data`. */
export interface AuditLogPage {
  content: AuditLogRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}