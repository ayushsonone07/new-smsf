import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { TopBar, type TopBarUser } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  user: TopBarUser | null;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
}

const SIDEBAR_COLLAPSED_KEY = "hrm-sidebar-collapsed";

export function AppShell({ children, user, onLogout, title, subtitle }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const persisted = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (persisted !== null) return persisted === "true";
    return false;
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileSidebarOpen]);

  const handleCollapsedChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden overflow-x-hidden bg-surface text-foreground">
      <Sidebar
        user={user}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCollapsedChange={handleCollapsedChange}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div
        className={`
          workspace-canvas flex h-screen flex-col min-w-0 overflow-hidden transition-[margin-left] duration-300 ease-in-out
          ${sidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[250px]"}
        `}
      >
        <TopBar
          onMenuClick={() => setMobileSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
          user={user}
        />

        <main className="flex-1 overflow-y-auto min-w-0 px-5 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1560px] space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
