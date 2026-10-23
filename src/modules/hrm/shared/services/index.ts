// Cross-feature services: the axios instance, query client, interceptors, token storage.
// Feature-specific service calls belong in features/<feature>/services/.
export {
  http,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  setUnauthorizedHandler,
  setRefreshEndpoint,
} from "./http";
export type { ApiEnvelope, AuthAwareRequestConfig } from "./http";

export { hrApiGet, hrApiGetPaged, hrApiPost, hrApiPut, hrApiPatch, hrApiDelete, HrApiException } from "./hrApi";
export { checkHrmServiceHealth, type HrmHealthResult } from "./hrmHealthService";

