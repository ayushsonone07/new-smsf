// /**
//  * Single source of truth for environment variables.
//  *
//  * Do NOT read `import.meta.env.VITE_*` anywhere else in the app.
//  * Import from here so every consumer gets:
//  *   - typed access
//  *   - one place to add validation / fallbacks
//  *   - one place to swap implementation (e.g. runtime config in the future)
//  */

// function required(name: keyof ImportMetaEnv): string {
//   const value = import.meta.env[name];
//   if (!value) {
//     throw new Error(
//       `[env] Missing required environment variable: ${String(name)}. ` +
//         `Check .env.${import.meta.env.MODE} and .env.example.`,
//     );
//   }
//   return value.replace(/\/+$/, "");
// }

// export const env = {
//   // Runtime mode flags
//   mode: import.meta.env.MODE,
//   isDev: import.meta.env.DEV,
//   isProd: import.meta.env.PROD,

//   // App
//   appName: required("VITE_HRM_APP_NAME"),
//   appVersion: required("VITE_HRM_APP_VERSION"),

//   // URLs
//   apiUrl: required("VITE_HRM_API_URL"),
//   frontendUrl: required("VITE_HRM_FRONTEND_URL"),
// } as const;

// export type Env = typeof env;


/**
 * Single source of truth for environment variables.
 *
 * Do NOT read `import.meta.env.VITE_*` anywhere else in the app.
 * Import from here so every consumer gets:
 *   - typed access
 *   - one place to add validation / fallbacks
 *   - one place to swap implementation (e.g. runtime config in the future)
 */

function getEnv(name: string, fallback: string = ""): string {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  if (!value) {
    return fallback;
  }
  return value.replace(/\/+$/, "");
}

export const env = {
  // Runtime mode flags
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  // App
  appName: getEnv("VITE_HRM_APP_NAME", "HRM"),
  appVersion: getEnv("VITE_HRM_APP_VERSION", "1.0.0"),

  // Feature flags
  enableDashboardDemo: import.meta.env.VITE_ENABLE_DASHBOARD_DEMO === "true",
  enableDemoData: import.meta.env.VITE_ENABLE_DEMO_DATA === "true",

  // URLs
  apiUrl: getEnv("VITE_HRM_API_URL", "http://localhost:8080"),
  frontendUrl: getEnv("VITE_HRM_FRONTEND_URL", "http://localhost:5173"),

  // SMTP API Key for cross-app access (CRM -> HRM SMTP)
  hrmSmtpApiKey: import.meta.env.VITE_HRM_SMTP_API_KEY || "dev-hrm-api-key-8f3Kx92Lm7Qa",
} as const;

export type Env = typeof env;
