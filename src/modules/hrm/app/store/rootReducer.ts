import { authReducer } from "@features/auth";

import { departmentReducer } from "@hrm/slices/departmentSlice";
import { designationReducer } from "@hrm/slices/designationSlice";
import { employeeReducer } from "@hrm/slices/employeeSlice";

export const rootReducer = {
  auth: authReducer,
  departments: departmentReducer,
  designations: designationReducer,
  employees: employeeReducer,
};
