import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hrService } from "../services";

import type { Department, DepartmentInput, Designation, DesignationInput } from "../types";

export const departmentsQueryKey = ["hr", "departments"] as const;
export const designationsQueryKey = ["hr", "designations"] as const;

export function useDepartments(enabled = true) {
  return useQuery<Department[], Error>({
    queryKey: departmentsQueryKey,
    queryFn: () => hrService.listDepartments(),
    enabled,
    refetchOnMount: "always",
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();

  return useMutation<Department, Error, DepartmentInput>({
    mutationFn: (input) => hrService.createDepartment(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsQueryKey });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();

  return useMutation<Department, Error, { id: number; input: DepartmentInput }>({
    mutationFn: ({ id, input }) => hrService.updateDepartment(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsQueryKey });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();

  return useMutation<string, Error, number>({
    mutationFn: (id) => hrService.deleteDepartment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsQueryKey });
    },
  });
}

export function useDesignations(enabled = true) {
  return useQuery<Designation[], Error>({
    queryKey: designationsQueryKey,
    queryFn: () => hrService.listDesignations(),
    enabled,
    refetchOnMount: "always",
  });
}

export function useCreateDesignation() {
  const qc = useQueryClient();

  return useMutation<Designation, Error, DesignationInput>({
    mutationFn: (input) => hrService.createDesignation(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: designationsQueryKey });
    },
  });
}

export function useUpdateDesignation() {
  const qc = useQueryClient();

  return useMutation<Designation, Error, { id: number; input: DesignationInput }>({
    mutationFn: ({ id, input }) => hrService.updateDesignation(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: designationsQueryKey });
    },
  });
}

export function useDeleteDesignation() {
  const qc = useQueryClient();

  return useMutation<string, Error, number>({
    mutationFn: (id) => hrService.deleteDesignation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: designationsQueryKey });
    },
  });
}
