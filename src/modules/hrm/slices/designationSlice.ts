import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { hrService } from "@features/hr";
import type { Designation, DesignationInput } from "@features/hr";
import { getApiErrorMessage } from "@shared/lib";

import type { ApiErrorPayload } from "@hrm/utils/asyncThunk";

interface DesignationState {
  designations: Designation[];
  isLoading: boolean;
  error: string | null;
}

interface DesignationStateShape {
  designations: DesignationState;
}

const initialState: DesignationState = {
  designations: [],
  isLoading: false,
  error: null,
};

export const fetchDesignations = createAsyncThunk<
  Designation[],
  { force?: boolean } | undefined,
  { rejectValue: ApiErrorPayload; state: DesignationStateShape }
>(
  "designations/fetchDesignations",
  async (_, { rejectWithValue }) => {
    try {
      return await hrService.listDesignations();
    } catch (error) {
      return rejectWithValue({
        message: getApiErrorMessage(error, "Failed to load designations"),
      });
    }
  },
  {
    condition: (options, { getState }) => {
      const { designations } = getState();
      if (options?.force) return !designations.isLoading;
      return designations.designations.length === 0 && !designations.isLoading;
    },
  },
);

export const createDesignation = createAsyncThunk<
  Designation,
  DesignationInput,
  { rejectValue: ApiErrorPayload }
>("designations/createDesignation", async (input, { rejectWithValue }) => {
  try {
    return await hrService.createDesignation(input);
  } catch (error) {
    return rejectWithValue({
      message: getApiErrorMessage(error, "Failed to create designation"),
    });
  }
});

export const updateDesignation = createAsyncThunk<
  Designation,
  { id: number; input: DesignationInput },
  { rejectValue: ApiErrorPayload }
>("designations/updateDesignation", async ({ id, input }, { rejectWithValue }) => {
  try {
    return await hrService.updateDesignation(id, input);
  } catch (error) {
    return rejectWithValue({
      message: getApiErrorMessage(error, "Failed to update designation"),
    });
  }
});

export const deleteDesignation = createAsyncThunk<
  string,
  number,
  { rejectValue: ApiErrorPayload }
>("designations/deleteDesignation", async (id, { rejectWithValue }) => {
  try {
    return await hrService.deleteDesignation(id);
  } catch (error) {
    return rejectWithValue({
      message: getApiErrorMessage(error, "Failed to delete designation"),
    });
  }
});

const designationSlice = createSlice({
  name: "designations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDesignations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDesignations.fulfilled, (state, action) => {
        state.designations = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchDesignations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Failed to load designations";
      })
      .addCase(createDesignation.fulfilled, (state, action) => {
        state.designations.push(action.payload);
      })
      .addCase(updateDesignation.fulfilled, (state, action) => {
        const idx = state.designations.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) {
          state.designations[idx] = action.payload;
        }
      })
      .addCase(deleteDesignation.fulfilled, (state, action) => {
        state.designations = state.designations.filter(
          (d) => d.id !== action.meta.arg,
        );
      });
  },
});

export const designationReducer = designationSlice.reducer;
export default designationReducer;

export const selectDesignations = (state: {
  designations: DesignationState;
}): Designation[] => state.designations.designations;
export const selectDesignationsLoading = (state: {
  designations: DesignationState;
}): boolean => state.designations.isLoading;
export const selectDesignationsError = (state: {
  designations: DesignationState;
}): string | null => state.designations.error;
