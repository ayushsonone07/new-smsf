export interface PolicySection {
  sectionNumber: number;
  title: string;
  points: string[];
}

export interface PolicyStatus {
  acknowledged: boolean;
  policyVersion?: string;
  acceptedAt?: string | null;
  signatureName?: string | null;
  employeeName?: string | null;
  employeeCode?: string | null;
}

export interface CompanyPolicy {
  companyName: string;
  title: string;
  version: string;
  effectiveDate: string;
  sections: PolicySection[];
  myStatus?: PolicyStatus | null;
}

export interface PolicyAcceptanceInput {
  policyVersion?: string;
  signatureName: string;
  agreed: boolean;
}

export interface EmployeePolicyAcknowledgmentItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  acknowledged: boolean;
  policyVersion: string;
  acceptedAt: string | null;
  signatureName: string | null;
  ipAddress: string | null;
}

export interface PolicyAcknowledgmentsSummary {
  totalEmployees: number;
  acceptedCount: number;
  pendingCount: number;
  policyVersion: string;
  acknowledgments: EmployeePolicyAcknowledgmentItem[];
}
