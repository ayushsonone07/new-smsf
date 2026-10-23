import { useEffect } from "react";
import { AppProviders } from "@hrm/app/providers";
import { ThemeProvider, useTheme } from "@hrm/components/theme-provider";

import HrmApp from "./App";
import "./style.css";

function ScopedApp() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    document.body.classList.add("hrm-active");
    if (resolvedTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    return () => {
      document.body.classList.remove("hrm-active");
      document.body.classList.remove("dark");
    };
  }, [resolvedTheme]);

  return (
    <div className={`hrm-scope ${resolvedTheme} min-h-screen bg-background text-foreground`}>
      <HrmApp />
    </div>
  );
}

export default function HrmRoot() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="crm-theme">
      <AppProviders>
        <ScopedApp />
      </AppProviders>
    </ThemeProvider>
  );
}
