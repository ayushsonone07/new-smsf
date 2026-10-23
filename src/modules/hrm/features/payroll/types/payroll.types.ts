export type PayrollStatus =
  | "DRAFT"
  | "CALCULATED"
  | "APPROVED"
  | "PROCESSED"
  | "PAID"
  | "CANCELLED";

export type SalaryStructureStatus = "ACTIVE" | "INACTIVE";

export type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "UPI" | "WALLET" | "INTERNAL";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export type EarningType = "BASIC" | "HRA" | "CONVEYANCE" | "MEDICAL" | "SPECIAL_ALLOWANCE";

export type DeductionType = "PF" | "ESI" | "TDS" | "PROFESSIONAL_TAX" | "UNPAID_LEAVE" | "HALF_DAY";

export interface SalaryStructure {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  employeeCode?: string | null;
  basicSalary: string;
  hra: string;
  conveyanceAllowance: string;
  medicalAllowance: string;
  specialAllowance: string;
  grossSalary?: string | null;
  pfEnabled: boolean;
  esiEnabled: boolean;
  tdsEnabled: boolean;
  professionalTaxEnabled: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: SalaryStructureStatus;
}

export interface SalaryStructureInput {
  employeeId: number;
  basicSalary: string;
  hra: string;
  conveyanceAllowance: string;
  medicalAllowance: string;
  specialAllowance: string;
  pfEnabled: boolean;
  esiEnabled: boolean;
  tdsEnabled: boolean;
  professionalTaxEnabled: boolean;
  effectiveFrom: string;
}

export interface GeneratePayrollInput {
  month: number;
  year: number;
  employeeId?: number | null;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossSalary: string;
  totalDeductions: string;
  totalNetSalary: string;
  draftCount: number;
  calculatedCount: number;
  approvedCount: number;
  processedCount: number;
  paidCount: number;
}

export interface PayrollEarning {
  earningType: EarningType;
  description: string;
  amount: string;
}

export interface PayrollDeduction {
  deductionType: DeductionType;
  description: string;
  amount: string;
}

export interface Payslip {
  id: number;
  payrollId: number;
  payslipNumber: string;
  generatedAt: string;
  filePath?: string | null;
}

export interface PaymentRecord {
  id: number;
  payrollId: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  amount: string;
  status: PaymentStatus;
  employeeName?: string | null;
  employeeCode?: string | null;
  payrollMonth?: number | null;
  payrollYear?: number | null;
}

export interface Payroll {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName?: string | null;
  designationTitle?: string | null;
  payrollMonth: number;
  payrollYear: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  halfDayAttendance: number;
  grossSalary: string;
  totalEarnings: string;
  totalDeductions: string;
  netSalary: string;
  status: PayrollStatus;
  processedAt?: string | null;
}

export interface PayrollDetails extends Payroll {
  earnings: PayrollEarning[];
  deductions: PayrollDeduction[];
  payslip: Payslip | null;
  payments: PaymentRecord[];
}

export interface PayslipDetails {
  companyName: string;
  companyAddress?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  payrollId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName?: string | null;
  designationTitle?: string | null;
  payrollMonth: number;
  payrollYear: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  halfDayAttendance: number;
  earnings: PayrollEarning[];
  deductions: PayrollDeduction[];
  grossSalary: string;
  totalEarnings: string;
  totalDeductions: string;
  netSalary: string;
  status: PayrollStatus;
  payslipNumber?: string | null;
  paymentDate?: string | null;
  transactionReference?: string | null;
}

export interface PayrollListParams {
  page?: number;
  size?: number;
  employeeId?: number;
  month?: number | "";
  year?: number | "";
  status?: PayrollStatus | "";
  departmentId?: number;
  q?: string;
  sort?: string;
}

export interface PayrollPaymentInput {
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  amount: string;
}

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Draft",
  CALCULATED: "Calculated",
  APPROVED: "Approved",
  PROCESSED: "Processed",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  UPI: "UPI",
  WALLET: "Wallet",
  INTERNAL: "Internal Transfer",
};

export const EARNING_LABELS: Record<EarningType, string> = {
  BASIC: "Basic",
  HRA: "HRA",
  CONVEYANCE: "Conveyance",
  MEDICAL: "Medical",
  SPECIAL_ALLOWANCE: "Special Allowance",
};

export const DEDUCTION_LABELS: Record<DeductionType, string> = {
  PF: "Provident Fund",
  ESI: "ESI",
  TDS: "TDS",
  PROFESSIONAL_TAX: "Professional Tax",
  UNPAID_LEAVE: "Unpaid Leave",
  HALF_DAY: "Half-Day Attendance",
};
