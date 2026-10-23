import { configureStore } from "@reduxjs/toolkit";

import { AUTH_ENDPOINTS } from "@features/auth";
import { clearAuth } from "@features/auth";
import { setRefreshEndpoint, setUnauthorizedHandler } from "@shared/services";

import { rootReducer } from "./rootReducer";

export const store = configureStore({
  reducer: rootReducer,
});

setRefreshEndpoint(AUTH_ENDPOINTS.refresh);
setUnauthorizedHandler(() => {
  store.dispatch(clearAuth());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
