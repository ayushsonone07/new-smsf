import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { payrollService } from "../services";

import type {
  GeneratePayrollInput,
  Payroll,
  PayrollListParams,
  PayrollPaymentInput,
  SalaryStructure,
  SalaryStructureInput,
} from "../types";

export const payrollKeys = {
  all: ["payroll"] as const,
  structures: ["payroll", "structures"] as const,
  structure: (employeeId: number) => ["payroll", "structures", employeeId] as const,
  list: (params: PayrollListParams) => ["payroll", "list", params] as const,
  summary: (month: number, year: number) => ["payroll", "summary", month, year] as const,
  detail: (id: number) => ["payroll", "detail", id] as const,
  payslips: (employeeId: number) => ["payroll", "payslips", employeeId] as const,
};

export function usePayrolls(params: PayrollListParams) {
  return useQuery({
    queryKey: payrollKeys.list(params),
    queryFn: () => payrollService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useEmployeePayrolls(employeeId: number) {
  return useQuery({
    queryKey: payrollKeys.list({ employeeId }),
    queryFn: () => payrollService.employeePayrolls(employeeId),
    enabled: employeeId > 0,
  });
}

export function usePayrollDetails(id: number) {
  return useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn: () => payrollService.getDetails(id),
    enabled: id > 0,
  });
}

export function usePayrollSummary(month: number, year: number) {
  return useQuery({
    queryKey: payrollKeys.summary(month, year),
    queryFn: () => payrollService.summary(month, year),
    enabled: month > 0 && year > 0,
    placeholderData: (prev) => prev,
  });
}

export function useSalaryStructure(employeeId: number) {
  return useQuery({
    queryKey: payrollKeys.structure(employeeId),
    queryFn: () => payrollService.structureForEmployee(employeeId),
    enabled: employeeId > 0,
  });
}

export function useEmployeePayslips(employeeId: number) {
  return useQuery({
    queryKey: payrollKeys.payslips(employeeId),
    queryFn: () => payrollService.employeePayslips(employeeId),
    enabled: employeeId > 0,
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation<Payroll[], Error, GeneratePayrollInput>({
    mutationFn: (input) => payrollService.generate(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

export function useSaveSalaryStructure() {
  const qc = useQueryClient();
  return useMutation<SalaryStructure, Error, { employeeId: number; input: SalaryStructureInput }>({
    mutationFn: async ({ employeeId, input }) => {
      const existing = await payrollService.structureForEmployee(employeeId);
      if (existing) {
        return payrollService.updateStructure(existing.id, input);
      }
      return payrollService.createStructure(input);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: payrollKeys.structures });
      void qc.invalidateQueries({ queryKey: payrollKeys.structure(vars.employeeId) });
    },
  });
}

export function useApprovePayroll() {
  const qc = useQueryClient();
  return useMutation<Payroll, Error, number>({
    mutationFn: (id) => payrollService.approve(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

export function useProcessPayroll() {
  const qc = useQueryClient();
  return useMutation<Payroll, Error, number>({
    mutationFn: (id) => payrollService.process(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation<Payroll, Error, { id: number; input: PayrollPaymentInput }>({
    mutationFn: ({ id, input }) => payrollService.markPaid(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

export function useCancelPayroll() {
  const qc = useQueryClient();
  return useMutation<Payroll, Error, number>({
    mutationFn: (id) => payrollService.cancel(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}