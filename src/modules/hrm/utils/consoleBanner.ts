/**
 * Console Banner Utility for HRM Frontend
 * Displays environment-specific banners in browser console
 */

const DEV_BANNER = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🏢 MBG Card - HRM System                                                  ║
║                                                                              ║
║   🚀 DEVELOPMENT MODE                                                         ║
║                                                                              ║
║   📦 Version: 1.0.0                                                          ║
║   🔧 Vite + React + TypeScript                                               ║
║   📡 API: http://localhost:8081                                              ║
║                                                                              ║
║   🛠️  Features Enabled:                                                      ║
║      • Hot Module Replacement                                                ║
║      • Redux DevTools                                                        ║
║      • Detailed Error Logging                                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

const PROD_BANNER = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🏢 MBG Card - HRM System                                                  ║
║                                                                              ║
║   🏭 PRODUCTION MODE                                                          ║
║                                                                              ║
║   📦 Version: 1.0.0                                                          ║
║   ⚡ Optimized Build                                                          ║
║   🔒 Security Headers Enabled                                                ║
║                                                                              ║
║   ✅ System Ready                                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

const DEV_STYLES = [
  "background: #667eea",
  "color: white",
  "font-family: monospace",
  "font-size: 12px",
  "font-weight: bold",
  "padding: 10px 20px",
  "border-radius: 8px",
  "text-shadow: 1px 1px 2px rgba(0,0,0,0.3)",
].join(";");

const PROD_STYLES = [
  "background: #11998e",
  "color: white",
  "font-family: monospace",
  "font-size: 12px",
  "font-weight: bold",
  "padding: 10px 20px",
  "border-radius: 8px",
  "text-shadow: 1px 1px 2px rgba(0,0,0,0.3)",
].join(";");

/**
 * Prints the appropriate banner based on the environment
 */
export function printConsoleBanner(): void {
  const isDev = import.meta.env.DEV;
  const mode = import.meta.env.MODE;

  // Clear console in dev mode for clean output
  if (isDev) {
    console.clear();
  }

  if (isDev) {
    console.log("%c" + DEV_BANNER, DEV_STYLES);
    console.info("📝 HRM System running in DEVELOPMENT mode");
    console.info("🔧 Redux DevTools: Enabled");
    console.info("🔄 HMR: Enabled");
    console.group("📊 Environment Details");
    console.log("Mode:", mode);
    console.log("Base URL:", import.meta.env.BASE_URL);
    console.log("API URL:", import.meta.env.VITE_API_URL || "http://localhost:8081");
    console.groupEnd();
  } else {
    console.log("%c" + PROD_BANNER, PROD_STYLES);
    console.info("✅ HRM System running in PRODUCTION mode");
  }

  // Security warning
  if (window.location.protocol !== "https:" && !isDev) {
    console.warn("⚠️  WARNING: Not using HTTPS in production!");
  }
}

/**
 * Logs a styled message for important events
 */
export function logEvent(
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[HRM ${timestamp}]`;

  const styles: Record<string, string> = {
    info: "color: #3b82f6; font-weight: bold;",
    success: "color: #22c55e; font-weight: bold;",
    warning: "color: #f59e0b; font-weight: bold;",
    error: "color: #ef4444; font-weight: bold;",
  };

  console.log(`%c${prefix} %c${message}`, "color: #6b7280;", styles[type]);
}

/**
 * Logs API calls with styling
 */
export function logApiCall(method: string, endpoint: string, duration?: number): void {
  if (import.meta.env.DEV) {
    const durationStr = duration ? `(${duration}ms)` : "";
    console.log(
      `%c[API]%c ${method} %c${endpoint} %c${durationStr}`,
      "background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: #6b7280;",
      "color: #3b82f6; font-weight: bold;",
      "color: #22c55e;",
    );
  }
}

export default printConsoleBanner;
