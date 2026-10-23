import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { HR_ENDPOINT_BUILDERS, HR_ENDPOINTS } from "@features/hr";
import type { EmployeeListItem } from "@features/hr";
import type { PaginationMeta } from "@shared/types";
import type { ResendPasswordSetupResponse } from "@features/hr";

import { apiClient } from "@hrm/utils/apiClient";
import { normalizeApiError } from "@hrm/utils/apiError";
import type { ApiErrorPayload } from "@hrm/utils/asyncThunk";

type EmployeeStatus = "active" | "on_leave" | "notice" | "terminated";

interface EmployeeFilters {
  q: string | undefined;
  status: string | undefined;
  onboardingStatus: string | undefined;
  page: number;
  size: number;
  sort: string | undefined;
}

interface EmployeeState {
  items: EmployeeListItem[];
  selectedEmployee: EmployeeListItem | null;
  managerOptions: EmployeeListItem[];
  pagination: PaginationMeta;
  filters: EmployeeFilters;
  isLoading: boolean;
  isDetailLoading: boolean;
  isManagerOptionsLoading: boolean;
  isMutating: boolean;
  error: string | null;
  mutationError: string | null;
}

const initialPagination: PaginationMeta = {
  page: 0,
  size: 12,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
};

const initialFilters: EmployeeFilters = {
  q: undefined,
  status: undefined,
  onboardingStatus: undefined,
  page: 0,
  size: 12,
  sort: "createdAt,desc",
};

const initialState: EmployeeState = {
  items: [],
  selectedEmployee: null,
  managerOptions: [],
  pagination: initialPagination,
  filters: initialFilters,
  isLoading: false,
  isDetailLoading: false,
  isManagerOptionsLoading: false,
  isMutating: false,
  error: null,
  mutationError: null,
};

interface HrEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; field?: string } | null;
  meta: PaginationMeta | null;
}

interface LegacyEnvelope<T> {
  status: string;
  message: string;
  data: T;
  timestamp: string;
}

export const fetchEmployees = createAsyncThunk<
  { items: EmployeeListItem[]; meta: PaginationMeta },
  EmployeeFilters | undefined,
  { rejectValue: ApiErrorPayload }
>("employees/fetchEmployees", async (filters, { rejectWithValue }) => {
  try {
    const f = filters ?? initialFilters;
    const params: Record<string, string | number> = {};
    if (f.q) params.q = f.q;
    if (f.status) params.status = f.status;
    if (f.onboardingStatus) params.onboardingStatus = f.onboardingStatus;
    params.page = f.page;
    params.size = f.size;
    if (f.sort) params.sort = f.sort;
    const response = await apiClient.get<HrEnvelope<{ items: EmployeeListItem[] }>>(
      HR_ENDPOINTS.employees,
      { params },
    );
    const envelope = response.data;
    if (!envelope.success || !envelope.data || !envelope.meta) {
      return rejectWithValue({
        message: envelope.error?.message ?? "Failed to load employees",
      });
    }
    return { items: envelope.data.items, meta: envelope.meta };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error, "Unable to load employees"));
  }
});

export const fetchEmployeeById = createAsyncThunk<
  EmployeeListItem,
  number,
  { rejectValue: ApiErrorPayload; state: EmployeeStateShape }
>(
  "employees/fetchEmployeeById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<LegacyEnvelope<EmployeeListItem>>(
        HR_ENDPOINT_BUILDERS.employee(id),
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(normalizeApiError(error, "Unable to load employee details"));
    }
  },
  {
    condition: (_, { getState }) => {
      const { employees } = getState();
      return !employees.isDetailLoading;
    },
  },
);

export const updateEmployee = createAsyncThunk<
  EmployeeListItem,
  { id: number; input: Partial<EmployeeListItem> },
  { rejectValue: ApiErrorPayload }
>("employees/updateEmployee", async ({ id, input }, { rejectWithValue }) => {
  try {
    const response = await apiClient.patch<LegacyEnvelope<EmployeeListItem>>(
      HR_ENDPOINT_BUILDERS.employee(id),
      input,
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error, "Unable to update employee"));
  }
});

interface EmployeeStateShape {
  employees: EmployeeState;
}

export const fetchManagerEmployees = createAsyncThunk<
  EmployeeListItem[],
  void,
  { rejectValue: ApiErrorPayload; state: EmployeeStateShape }
>(
  "employees/fetchManagerEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<LegacyEnvelope<EmployeeListItem[]>>(
        HR_ENDPOINT_BUILDERS.managerEmployees(),
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(normalizeApiError(error, "Unable to load manager options"));
    }
  },
  {
    condition: (_, { getState }) => {
      const { employees } = getState();
      return !employees.isManagerOptionsLoading;
    },
  },
);

export const updateEmployeeStatus = createAsyncThunk<
  EmployeeListItem,
  { id: number; status: EmployeeStatus; exitDate?: string | null },
  { rejectValue: ApiErrorPayload }
>("employees/updateEmployeeStatus", async ({ id, status, exitDate }, { rejectWithValue }) => {
  try {
    const response = await apiClient.patch<LegacyEnvelope<EmployeeListItem>>(
      HR_ENDPOINT_BUILDERS.employeeStatus(id),
      { status, exitDate },
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error, "Unable to update employee status"));
  }
});

export const resendPasswordSetupLink = createAsyncThunk<
  ResendPasswordSetupResponse,
  number,
  { rejectValue: ApiErrorPayload }
>("employees/resendPasswordSetupLink", async (employeeId, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<LegacyEnvelope<ResendPasswordSetupResponse>>(
      HR_ENDPOINT_BUILDERS.resendPasswordSetupLink(employeeId),
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error, "Unable to resend password setup link"));
  }
});

const employeeSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    clearEmployeeError(state) {
      state.error = null;
      state.mutationError = null;
    },
    clearSelectedEmployee(state) {
      state.selectedEmployee = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.meta;
        state.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Unable to load employees";
      })
      .addCase(fetchEmployeeById.pending, (state) => {
        state.isDetailLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.isDetailLoading = false;
        state.selectedEmployee = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.isDetailLoading = false;
        state.error = action.payload?.message ?? "Unable to load employee details";
      })
      .addCase(fetchManagerEmployees.pending, (state) => {
        state.isManagerOptionsLoading = true;
        state.error = null;
      })
      .addCase(fetchManagerEmployees.fulfilled, (state, action) => {
        state.isManagerOptionsLoading = false;
        state.managerOptions = action.payload;
        state.error = null;
      })
      .addCase(fetchManagerEmployees.rejected, (state, action) => {
        state.isManagerOptionsLoading = false;
        state.error = action.payload?.message ?? "Unable to load manager options";
      })
      .addCase(updateEmployee.pending, (state) => {
        state.isMutating = true;
        state.mutationError = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.isMutating = false;
        state.selectedEmployee = action.payload;
        state.mutationError = null;
        const idx = state.items.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.isMutating = false;
        state.mutationError = action.payload?.message ?? "Unable to update employee";
      })
      .addCase(updateEmployeeStatus.pending, (state) => {
        state.isMutating = true;
        state.mutationError = null;
      })
      .addCase(updateEmployeeStatus.fulfilled, (state, action) => {
        state.isMutating = false;
        if (state.selectedEmployee?.id === action.payload.id) {
          state.selectedEmployee = action.payload;
        }
        const idx = state.items.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
        state.mutationError = null;
      })
      .addCase(updateEmployeeStatus.rejected, (state, action) => {
        state.isMutating = false;
        state.mutationError = action.payload?.message ?? "Unable to update employee status";
      })
      .addCase(resendPasswordSetupLink.pending, (state) => {
        state.isMutating = true;
        state.mutationError = null;
      })
      .addCase(resendPasswordSetupLink.fulfilled, (state) => {
        state.isMutating = false;
        state.mutationError = null;
      })
      .addCase(resendPasswordSetupLink.rejected, (state, action) => {
        state.isMutating = false;
        state.mutationError = action.payload?.message ?? "Unable to resend password setup link";
      });
  },
});

export const { clearEmployeeError, clearSelectedEmployee } = employeeSlice.actions;
export const employeeReducer = employeeSlice.reducer;
export default employeeReducer;

interface RootStateWithEmployees {
  employees: EmployeeState;
}

export const selectEmployees = (state: RootStateWithEmployees): EmployeeListItem[] =>
  state.employees.items;
export const selectSelectedEmployee = (state: RootStateWithEmployees): EmployeeListItem | null =>
  state.employees.selectedEmployee;
export const selectEmployeesPagination = (state: RootStateWithEmployees): PaginationMeta =>
  state.employees.pagination;
export const selectEmployeesLoading = (state: RootStateWithEmployees): boolean =>
  state.employees.isLoading;
export const selectEmployeeDetailLoading = (state: RootStateWithEmployees): boolean =>
  state.employees.isDetailLoading;
export const selectEmployeeMutating = (state: RootStateWithEmployees): boolean =>
  state.employees.isMutating;
export const selectEmployeesError = (state: RootStateWithEmployees): string | null =>
  state.employees.error;
export const selectEmployeeMutationError = (state: RootStateWithEmployees): string | null =>
  state.employees.mutationError;
export const selectManagerOptions = (state: RootStateWithEmployees): EmployeeListItem[] =>
  state.employees.managerOptions;
export const selectManagerOptionsLoading = (state: RootStateWithEmployees): boolean =>
  state.employees.isManagerOptionsLoading;
