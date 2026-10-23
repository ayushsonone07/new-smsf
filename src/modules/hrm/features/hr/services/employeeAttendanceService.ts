import { http } from "@shared/services";
import type { ApiEnvelope } from "@shared/services";

import type { EmployeeAttendanceMonthlyResponse } from "../types";

export const employeeAttendanceService = {
  async getMonthlyHistory(employeeId: number, month: number, year: number): Promise<EmployeeAttendanceMonthlyResponse> {
    const { data } = await http.get<ApiEnvelope<EmployeeAttendanceMonthlyResponse>>(
      `/api/v1/attendance/employees/${employeeId}/monthly-history`,
      { params: { month, year } },
    );
    return data.data;
  },
};
