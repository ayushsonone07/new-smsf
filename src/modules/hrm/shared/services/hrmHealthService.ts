import { http } from "./http";

export interface HrmHealthResult {
  isOnline: boolean;
  error?: string | null;
}

let cachedHealthPromise: Promise<HrmHealthResult> | null = null;
let lastHealthCheckTime = 0;
const CACHE_TTL_MS = 4000;

/**
 * Checks if the HRM backend service is reachable and running.
 *
 * Pings the HRM backend via `/api/v1/auth/me` with a fast timeout.
 * - If status is 200, 401, 403, 400, or other standard application response: service is ONLINE.
 * - If network error, timeout, 502/503/504 gateway error, or ngrok tunnel error: service is OFFLINE.
 */
export async function checkHrmServiceHealth(
  force = false,
  timeoutMs = 3500
): Promise<HrmHealthResult> {
  const now = Date.now();
  if (!force && cachedHealthPromise && now - lastHealthCheckTime < CACHE_TTL_MS) {
    return cachedHealthPromise;
  }

  lastHealthCheckTime = now;
  cachedHealthPromise = (async () => {
    try {
      await http.get("/api/v1/auth/me", {
        timeout: timeoutMs,
        _skipAuthRefresh: true,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      return { isOnline: true };
    } catch (err: any) {
      const status = err?.response?.status;
      const isNgrokError =
        Boolean(err?.response?.headers?.["ngrok-error-code"]) ||
        (typeof err?.response?.data === "string" &&
          (err.response.data.includes("ngrok") ||
            err.response.data.includes("ERR_NGROK")));

      if (isNgrokError) {
        return {
          isOnline: false,
          error: "The HRM backend service is currently offline or unreachable.",
        };
      }

      // If backend responded with a standard HTTP status code (401 Unauthorized, 403, 400, etc.),
      // it means the HRM server is running and responding!
      if (status && status >= 200 && status < 500) {
        return { isOnline: true };
      }

      return {
        isOnline: false,
        error: "The HRM backend service is currently offline or unreachable.",
      };
    }
  })();

  return cachedHealthPromise;
}
