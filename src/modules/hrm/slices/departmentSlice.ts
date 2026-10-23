import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrService } from "@features/hr";
import type { Department, DepartmentInput } from "@features/hr";
import { getApiErrorMessage } from "@shared/lib";

import type { ApiErrorPayload } from "@hrm/utils/asyncThunk";

interface DepartmentState {
  departments: Department[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DepartmentState = {
  departments: [],
  isLoading: false,
  error: null,
};

interface DepartmentStateShape {
  departments: DepartmentState;
}

export const fetchDepartments = createAsyncThunk<
  Department[],
  { force?: boolean } | undefined,
  { rejectValue: ApiErrorPayload; state: DepartmentStateShape }
>(
  "departments/fetchDepartments",
  async (_, { rejectWithValue }) => {
    try {
      return await hrService.listDepartments();
    } catch (error) {
      return rejectWithValue({
        message: getApiErrorMessage(error, "Failed to load departments"),
      });
    }
  },
  {
    condition: (options, { getState }) => {
      const { departments } = getState();
      if (options?.force) return !departments.isLoading;
      return departments.departments.length === 0 && !departments.isLoading;
    },
  },
);

export const createDepartment = createAsyncThunk<
  Department,
  DepartmentInput,
  { rejectValue: ApiErrorPayload }
>("departments/createDepartment", async (input, { rejectWithValue }) => {
  try {
    return await hrService.createDepartment(input);
  } catch (error) {
    return rejectWithValue({
      message: getApiErrorMessage(error, "Failed to create department"),
    });
  }
});

export const updateDepartment = createAsyncThunk<
  Department,
  { id: number; input: DepartmentInput },
  { rejectValue: ApiErrorPayload }
>("departments/updateDepartment", async ({ id, input }, { rejectWithValue }) => {
  try {
    return await hrService.updateDepartment(id, input);
  } catch (error) {
    return rejectWithValue({
      message: getApiErrorMessage(error, "Failed to update department"),
    });
  }
});

export const deleteDepartment = createAsyncThunk<
  string,
  number,
  { rejectValue: ApiErrorPayload }
>("departments/deleteDepartment", async (id, { rejectWithValue }) => {
  try {
    return await hrService.deleteDepartment(id);
  } catch (error) {
    return rejectWithValue({
      message: getApiErrorMessage(error, "Failed to delete department"),
    });
  }
});

const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.departments = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Failed to load departments";
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.departments.push(action.payload);
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        const idx = state.departments.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) {
          state.departments[idx] = action.payload;
        }
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.departments = state.departments.filter(
          (d) => d.id !== action.meta.arg,
        );
      });
  },
});

export const departmentReducer = departmentSlice.reducer;
export default departmentReducer;

export const selectDepartments = (state: { departments: DepartmentState }): Department[] =>
  state.departments.departments;
export const selectDepartmentsLoading = (state: {
  departments: DepartmentState;
}): boolean => state.departments.isLoading;
export const selectDepartmentsError = (state: {
  departments: DepartmentState;
}): string | null => state.departments.error;
