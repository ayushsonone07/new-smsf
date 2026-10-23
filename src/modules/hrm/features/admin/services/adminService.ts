import { http } from "@shared/services";
import type { ApiEnvelope } from "@shared/services";

export interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  departmentId?: number;
}

export const ADMIN_ENDPOINTS = {
  createAdmin: "/api/v1/admin/create-admin",
  createManager: "/api/v1/admin/create-manager",
  createUser: "/api/v1/admin/users",
  createHrLegacy: "/manager/api/v1/create_new_hr",
} as const;

export const adminService = {
  async createUser(input: CreateUserInput): Promise<string> {
    const { data } = await http.post<ApiEnvelope<string>>(ADMIN_ENDPOINTS.createUser, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: input.password,
      role: input.role.toLowerCase(),
      departmentId: input.departmentId,
    });
    return data.message;
  },
  async createAdmin(input: CreateUserInput): Promise<string> {
    const { data } = await http.post<ApiEnvelope<string>>(ADMIN_ENDPOINTS.createAdmin, input);
    return data.message;
  },
  async createManager(input: CreateUserInput): Promise<string> {
    const { data } = await http.post<ApiEnvelope<string>>(ADMIN_ENDPOINTS.createManager, input);
    return data.message;
  },
};
