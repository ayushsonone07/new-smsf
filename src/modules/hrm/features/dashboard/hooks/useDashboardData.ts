import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "../services/dashboardService";

import type {
  AdminDashboardResponse,
  ChartsResponse,
  EmployeeDashboardResponse,
  HrHeadDashboardResponse,
  KpiResponse,
  SubHrDashboardResponse,
} from "../services/dashboardService";

export const dashboardKeys = {
  all: ["hr-dashboard"] as const,
  kpis: ["hr-dashboard", "kpis"] as const,
  charts: ["hr-dashboard", "charts"] as const,
};

export const adminDashboardKeys = {
  data: ["admin-dashboard"] as const,
};

export const hrHeadDashboardKeys = {
  data: ["hrhead-dashboard"] as const,
};

export const subHrDashboardKeys = {
  data: ["subhr-dashboard"] as const,
};

export const employeeDashboardKeys = {
  data: ["employee-dashboard"] as const,
};

export function useHrDashboardKpis() {
  return useQuery<KpiResponse, Error>({
    queryKey: dashboardKeys.kpis,
    queryFn: () => dashboardService.getKpis(),
  });
}

export function useHrDashboardCharts() {
  return useQuery<ChartsResponse, Error>({
    queryKey: dashboardKeys.charts,
    queryFn: () => dashboardService.getCharts(),
  });
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardResponse, Error>({
    queryKey: adminDashboardKeys.data,
    queryFn: () => dashboardService.getAdminDashboard(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHrHeadDashboard() {
  return useQuery<HrHeadDashboardResponse, Error>({
    queryKey: hrHeadDashboardKeys.data,
    queryFn: () => dashboardService.getHrHeadDashboard(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubHrDashboard() {
  return useQuery<SubHrDashboardResponse, Error>({
    queryKey: subHrDashboardKeys.data,
    queryFn: () => dashboardService.getSubHrDashboard(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeeDashboard() {
  return useQuery<EmployeeDashboardResponse, Error>({
    queryKey: employeeDashboardKeys.data,
    queryFn: () => dashboardService.getEmployeeDashboard(),
    staleTime: 5 * 60 * 1000,
  });
}
