import { hrApiGet, hrApiGetPaged, hrApiPost, hrApiPut, http } from "@shared/services";
import type { PaginationMeta } from "@shared/types";

import { PAYROLL_ENDPOINT_BUILDERS, PAYROLL_ENDPOINTS } from "./endpoints";

import type {
  GeneratePayrollBatchResult,
  GeneratePayrollInput,
  PayslipDetails,
  Payroll,
  PayrollDetails,
  PayrollListParams,
  PayrollPaymentInput,
  PayrollSummary,
  SalaryStructure,
  SalaryStructureInput,
} from "../types";

function queryString(params: PayrollListParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&")}`;
}

export const payrollService = {
  /* ------------------------- salary structures ------------------------- */
  async createStructure(input: SalaryStructureInput): Promise<SalaryStructure> {
    return hrApiPost<SalaryStructure, SalaryStructureInput>(
      PAYROLL_ENDPOINTS.salaryStructures,
      input,
    );
  },

  async updateStructure(id: number, input: SalaryStructureInput): Promise<SalaryStructure> {
    return hrApiPut<SalaryStructure, SalaryStructureInput>(
      PAYROLL_ENDPOINT_BUILDERS.salaryStructure(id),
      input,
    );
  },

  async structureForEmployee(employeeId: number): Promise<SalaryStructure | null> {
    try {
      return await hrApiGet<SalaryStructure>(
        PAYROLL_ENDPOINT_BUILDERS.salaryStructureByEmployee(employeeId),
      );
    } catch {
      return null;
    }
  },

  /* ------------------------------ payrolls ----------------------------- */
  async generate(input: GeneratePayrollInput): Promise<GeneratePayrollBatchResult> {
    return hrApiPost<GeneratePayrollBatchResult, GeneratePayrollInput>(PAYROLL_ENDPOINTS.generate, input);
  },

  async list(params: PayrollListParams): Promise<{ data: Payroll[]; meta: PaginationMeta }> {
    return hrApiGetPaged<Payroll[]>(PAYROLL_ENDPOINTS.payrolls + queryString(params));
  },

  async employeePayrolls(
    employeeId: number,
  ): Promise<{ data: Payroll[]; meta: PaginationMeta }> {
    return hrApiGetPaged<Payroll[]>(PAYROLL_ENDPOINT_BUILDERS.employeePayrolls(employeeId));
  },

  async getDetails(id: number): Promise<PayrollDetails> {
    return hrApiGet<PayrollDetails>(PAYROLL_ENDPOINT_BUILDERS.payroll(id));
  },

  async summary(month: number, year: number): Promise<PayrollSummary> {
    return hrApiGet<PayrollSummary>(
      `${PAYROLL_ENDPOINTS.summary}?month=${month}&year=${year}`,
    );
  },

  async approve(id: number): Promise<Payroll> {
    return hrApiPut<Payroll>(PAYROLL_ENDPOINT_BUILDERS.payrollApprove(id));
  },

  async process(id: number): Promise<Payroll> {
    return hrApiPut<Payroll>(PAYROLL_ENDPOINT_BUILDERS.payrollProcess(id));
  },

  async markPaid(id: number, input: PayrollPaymentInput): Promise<Payroll> {
    return hrApiPut<Payroll, PayrollPaymentInput>(
      PAYROLL_ENDPOINT_BUILDERS.payrollMarkPaid(id),
      input,
    );
  },

  async cancel(id: number): Promise<Payroll> {
    return hrApiPut<Payroll>(PAYROLL_ENDPOINT_BUILDERS.payrollCancel(id));
  },

  /* ------------------------------ payslips ----------------------------- */
  async employeePayslips(employeeId: number): Promise<PayslipDetails[]> {
    return hrApiGet<PayslipDetails[]>(PAYROLL_ENDPOINT_BUILDERS.employeePayslips(employeeId));
  },

  async payslipDetail(payrollId: number): Promise<PayslipDetails> {
    return hrApiGet<PayslipDetails>(PAYROLL_ENDPOINT_BUILDERS.payslipDetails(payrollId));
  },

  async downloadPayslipPdf(payrollId: number): Promise<Blob> {
    const { data } = await http.get<Blob>(PAYROLL_ENDPOINT_BUILDERS.payslipPdf(payrollId), {
      responseType: "blob",
    });
    return data;
  },
};