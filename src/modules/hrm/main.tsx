import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppProviders } from "@app/providers";

import { ThemeProvider, useTheme } from "@hrm/components/theme-provider";
import { printConsoleBanner } from "@hrm/utils/consoleBanner";

import App from "./App.tsx";
import "./style.css";

// Print environment banner
printConsoleBanner();

function ScopedApp() {
  const { resolvedTheme } = useTheme();
  return (
    <div className={`hrm-scope ${resolvedTheme}`}>
      <BrowserRouter>
        <Routes>
          <Route path="/hrm/*" element={<App />} />
          <Route path="*" element={<Navigate to="/hrm" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="crm-theme">
    <AppProviders>
      <ScopedApp />
    </AppProviders>
  </ThemeProvider>,
);
