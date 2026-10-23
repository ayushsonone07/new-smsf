import { useEffect, useMemo, useRef, useState } from "react";

import {
  Bell,
  CalendarDays,
  Command,
  Menu,
  Search,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useTheme } from "@hrm/components/theme-provider";
import { cn } from "@hrm/lib/utils";

export interface TopBarUser {
  name: string;
  email?: string;
  role: string;
}

interface TopBarProps {
  onMenuClick?: () => void;
  title?: string | undefined;
  subtitle?: string | undefined;
  user?: TopBarUser | null;
}

export function TopBar({ onMenuClick, title, subtitle, user }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  const userKey = user?.email?.toLowerCase() ?? "anonymous";

  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => {
    try {
      const raw = window.localStorage.getItem(`hrm_dismissed_announcements_${userKey}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedLeaveIds, setDismissedLeaveIds] = useState<Set<number>>(() => {
    try {
      const raw = window.localStorage.getItem(`hrm_dismissed_leaves_${userKey}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedHolidayIds, setDismissedHolidayIds] = useState<Set<number>>(() => {
    try {
      const raw = window.localStorage.getItem(`hrm_dismissed_holidays_${userKey}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedPayslipIds, setDismissedPayslipIds] = useState<Set<number>>(() => {
    try {
      const raw = window.localStorage.getItem(`hrm_dismissed_payslips_${userKey}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedReviewIds, setDismissedReviewIds] = useState<Set<number>>(() => {
    try {
      const raw = window.localStorage.getItem(`hrm_dismissed_reviews_${userKey}`);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const unreadCount = 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(`hrm_dismissed_announcements_${userKey}`, JSON.stringify([...dismissedIds]));
    } catch {
      // Ignore storage failures.
    }
  }, [dismissedIds, userKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`hrm_dismissed_leaves_${userKey}`, JSON.stringify([...dismissedLeaveIds]));
    } catch {
      // Ignore storage failures.
    }
  }, [dismissedLeaveIds, userKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`hrm_dismissed_holidays_${userKey}`, JSON.stringify([...dismissedHolidayIds]));
    } catch {
      // Ignore storage failures.
    }
  }, [dismissedHolidayIds, userKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`hrm_dismissed_payslips_${userKey}`, JSON.stringify([...dismissedPayslipIds]));
    } catch {
      // Ignore storage failures.
    }
  }, [dismissedPayslipIds, userKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`hrm_dismissed_reviews_${userKey}`, JSON.stringify([...dismissedReviewIds]));
    } catch {
      // Ignore storage failures.
    }
  }, [dismissedReviewIds, userKey]);

  useEffect(() => {
    setDismissedIds(() => {
      try {
        const raw = window.localStorage.getItem(`hrm_dismissed_announcements_${userKey}`);
        return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
      } catch {
        return new Set();
      }
    });
    setDismissedLeaveIds(() => {
      try {
        const raw = window.localStorage.getItem(`hrm_dismissed_leaves_${userKey}`);
        return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
      } catch {
        return new Set();
      }
    });
    setDismissedHolidayIds(() => {
      try {
        const raw = window.localStorage.getItem(`hrm_dismissed_holidays_${userKey}`);
        return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
      } catch {
        return new Set();
      }
    });
    setDismissedPayslipIds(() => {
      try {
        const raw = window.localStorage.getItem(`hrm_dismissed_payslips_${userKey}`);
        return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
      } catch {
        return new Set();
      }
    });
    setDismissedReviewIds(() => {
      try {
        const raw = window.localStorage.getItem(`hrm_dismissed_reviews_${userKey}`);
        return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
      } catch {
        return new Set();
      }
    });
  }, [userKey]);

  const notifications: Array<{
    key: string;
    badge: string;
    badgeClass: string;
    title: string;
    content: string;
    date: string;
    onClick: () => void;
  }> = [];

  const today = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  const searchItems = useMemo(() => {
    const common = [
      { label: "Dashboard", path: "/hrm/dashboard" },
      { label: "Attendance", path: "/hrm/attendance" },
      { label: "Leave Management", path: "/hrm/leave" },
      { label: "Holidays", path: "/hrm/holidays" },

      { label: "Performance", path: "/hrm/performance" },
      { label: "Settings", path: "/hrm/settings" },
    ];
    const hrItems = [
      { label: "Employees", path: "/hrm/employees" },
      { label: "Departments", path: "/hrm/departments" },
      { label: "Designations", path: "/hrm/designations" },
      { label: "Candidates", path: "/hrm/candidates" },
      { label: "Interviews", path: "/hrm/interviews" },

      { label: "Reports & Analytics", path: "/hrm/reports" },
    ];
    const role = user?.role;
    return role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "SUB_HR"
      ? [...common, ...hrItems]
      : common;
  }, [user?.role]);

  const results = query.trim()
    ? searchItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : searchItems.slice(0, 6);

  function closeAll() {
    setNotifOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const within = [
        notifRef.current?.contains(e.target as Node),
        searchRef.current?.contains(e.target as Node),
      ].some(Boolean);
      if (!within) closeAll();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (event.key === "Escape") closeAll();
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const iconButtonClasses =
    "mbg-icon-button relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-border bg-card/80 text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <header className="mbg-glass-header sticky top-0 z-50 flex h-[72px] w-full min-w-0 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className={cn(iconButtonClasses, "lg:hidden")}
        >
          <Menu size={19} />
        </button>

        <div className="hidden min-w-0 flex-col md:flex">
          <p className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
            {title ?? "HR Workspace"}
          </p>
          <p className="truncate text-[11px] leading-4 text-muted-foreground">
            {subtitle ?? "HRM workspace"}
          </p>
        </div>
      </div>

      <div ref={searchRef} className="relative hidden w-full max-w-[360px] lg:mx-auto lg:flex">
        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
            requestAnimationFrame(() => searchInputRef.current?.focus());
          }}
          aria-label="Search people and modules"
          className="mbg-command-search w-full cursor-pointer text-left"
        >
          <Search size={15} />
          <span className="flex-1">Search people, modules...</span>
          <span className="inline-flex items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command size={10} /> K
          </span>
        </button>
        {searchOpen ? (
          <div className="mbg-popover-in absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              placeholder="Type to search..."
              aria-label="Search query"
              className="mb-1 h-9 w-full border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    void navigate(item.path);
                    closeAll();
                    setQuery("");
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-card-foreground transition hover:bg-primary-soft hover:text-primary"
                >
                  <Search size={14} className="text-muted-foreground" /> {item.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                No matching modules
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 md:flex-none md:justify-end">
        <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground xl:inline-flex">
          <CalendarDays size={14} className="text-primary" />
          {today}
        </span>
        
        <div className="group relative">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(iconButtonClasses)}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
            {isDark ? "Light mode" : "Dark mode"}
          </span>
        </div>

        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifications"
            className={cn(iconButtonClasses)}
          >
            <Bell size={16} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {notifOpen ? (
            <div className="mbg-popover-in absolute right-0 top-full z-40 mt-1.5 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-sm font-semibold text-card-foreground">Notifications &amp; Updates</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate("/hrm/notifications");
                    }}
                    className="text-xs font-semibold text-muted-foreground hover:underline cursor-pointer"
                  >
                    View all
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.key}
                      onClick={notification.onClick}
                      className="cursor-pointer px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${notification.badgeClass}`}
                        >
                          {notification.badge}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{notification.date}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-foreground line-clamp-1">{notification.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{notification.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    You are all caught up. New announcements and updates will appear here.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {user ? (
          <button
            type="button"
            aria-label={`Signed in as ${user.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">
              {user.name
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </button>
        ) : null}

      </div>
    </header>
  );
}
