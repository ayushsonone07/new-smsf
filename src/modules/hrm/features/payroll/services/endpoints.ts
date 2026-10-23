export const PAYROLL_ENDPOINTS = {
  salaryStructures: "/api/v1/payroll/salary-structures",
  generate: "/api/v1/payroll/generate",
  payrolls: "/api/v1/payroll",
  summary: "/api/v1/payroll/summary",
  payslips: "/api/v1/payroll/payslips",
  payments: "/api/v1/payroll/payments",
} as const;

export const PAYROLL_ENDPOINT_BUILDERS = {
  salaryStructure: (id: number): string => `/api/v1/payroll/salary-structures/${id}`,
  salaryStructureByEmployee: (employeeId: number): string =>
    `/api/v1/payroll/salary-structures/${employeeId}`,
  payroll: (id: number): string => `/api/v1/payroll/${id}`,
  payrollApprove: (id: number): string => `/api/v1/payroll/${id}/approve`,
  payrollProcess: (id: number): string => `/api/v1/payroll/${id}/process`,
  payrollMarkPaid: (id: number): string => `/api/v1/payroll/${id}/mark-paid`,
  payrollCancel: (id: number): string => `/api/v1/payroll/${id}/cancel`,
  employeePayrolls: (employeeId: number): string =>
    `/api/v1/payroll/employee/${employeeId}`,
  employeePayslips: (employeeId: number): string =>
    `/api/v1/payroll/payslips/employee/${employeeId}`,
  payslipDetails: (payrollId: number): string =>
    `/api/v1/payroll/payslips/payroll/${payrollId}`,
  payslipPdf: (payrollId: number): string =>
    `/api/v1/payroll/payslips/payroll/${payrollId}/pdf`,
  payrollPayments: (payrollId: number): string =>
    `/api/v1/payroll/payments/payroll/${payrollId}`,
} as const;