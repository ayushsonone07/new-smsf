import { useEffect, useRef, useState } from "react";

import {
  ChevronDown,
  LogOut,
  Phone,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { isRole } from "@features/auth";
import type { Role } from "@features/auth";
import { getVisibleNavigation, isGroupItem, getActiveGroupLabel } from "@features/dashboard";
import type { NavLeafItem, NavigationItem } from "@features/dashboard";
import { ROUTES } from "@shared/constants";
import { useMyProfile } from "@features/auth";

import { SidebarNavGroup } from "./SidebarNavGroup";

import type { TopBarUser } from "./TopBar";

interface SidebarProps {
  user: TopBarUser | null;
  onLogout: () => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileClose: () => void;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function formatRole(role: string): string {
  if (role === "SUB_HR") return "Sub HR";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Sidebar({
  user,
  onLogout,
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileClose,
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("hrm-sidebar-collapsed", String(collapsed));
    if (collapsed) {
      setMenuOpen(false);
      setSettingsOpen(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  let role: Role | null = null;
  if (user?.role && isRole(user.role)) {
    role = user.role;
  }
  const items: NavigationItem[] = role ? getVisibleNavigation(role) : [];

  const activeGroupLabel = getActiveGroupLabel(items, location.pathname);

  const { data: profile } = useMyProfile();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const result = new Set<string>();
    if (activeGroupLabel) result.add(activeGroupLabel);
    return result;
  });

  useEffect(() => {
    if (activeGroupLabel) {
      setExpandedGroups((prev) => {
        if (prev.has(activeGroupLabel)) return prev;
        const next = new Set(prev);
        next.add(activeGroupLabel);
        return next;
      });
    }
  }, [activeGroupLabel]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function handleGroupToggle(label: string) {
    if (collapsed) {
      onCollapsedChange(false);
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        next.add(label);
        return next;
      });
      return;
    }
    toggleGroup(label);
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={`
          fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]
          transition-opacity duration-300 lg:hidden
          ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
        `}
      />

      <aside
        aria-label="Main navigation"
        className={`
          fixed inset-y-0 left-0 z-50 flex h-dvh flex-col overflow-hidden
          border-r border-sidebar-border bg-sidebar text-sidebar-foreground
          transition-all duration-300 ease-in-out

          w-[250px]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

          lg:translate-x-0
          ${collapsed ? "lg:w-[64px]" : "lg:w-[250px]"}
        `}
      >
        <header
          className={`
            relative flex h-[72px] shrink-0 items-center border-b border-sidebar-border px-4
            transition-all duration-300
            ${collapsed ? "lg:justify-center lg:px-2" : ""}
          `}
        >
          <div className={cnBrand(collapsed)}>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground"
            >
              M
            </span>
            <div
              className={cnBrandText(collapsed)}
            >
              <h1 className="text-[13px] font-extrabold leading-none tracking-tight text-sidebar-foreground">
                MBG HRM
              </h1>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
                People platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="
              absolute right-3 top-1/2 grid h-8 w-8
              -translate-y-1/2 cursor-pointer place-items-center
              rounded-lg border border-border bg-card
              text-muted-foreground transition-colors duration-200
              hover:border-danger/30 hover:bg-danger-soft hover:text-danger
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring lg:hidden
            "
          >
            <X size={16} />
          </button>
        </header>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          <div className="space-y-0.5">
            {items.map((item) =>
              isGroupItem(item) ? (
                <SidebarNavGroup
                  key={item.label}
                  group={item}
                  collapsed={collapsed}
                  expanded={expandedGroups.has(item.label)}
                  isAnyChildActive={activeGroupLabel === item.label}
                  onToggle={() => handleGroupToggle(item.label)}
                  onNavigate={onMobileClose}
                />
              ) : (
                <SidebarLeafItem
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onMobileClose}
                />
              ),
            )}
          </div>
        </nav>

        {user ? (
          <div
            ref={menuRef}
            className="relative shrink-0 border-t border-sidebar-border px-2 py-2"
          >
            {menuOpen ? (
              <div
                role="menu"
                className={`
                  mbg-profile-menu-in absolute bottom-full mb-0 overflow-hidden rounded-t-lg rounded-b-none border border-border bg-sidebar p-1.5
                  ${collapsed ? "left-0 right-0 lg:left-auto lg:right-0 lg:w-[260px]" : "left-2 right-2"}
                `}
              >
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5 text-foreground">
                      {user.email ?? user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatRole(user.role)}
                    </p>
                  </div>
                </div>

                <div className="mt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setSettingsOpen((current) => !current)}
                    aria-expanded={settingsOpen}
                    className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Settings size={16} />
                    Settings
                    <ChevronDown
                      size={14}
                      className={`ml-auto text-muted-foreground transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {settingsOpen ? (
                    <div className="mbg-profile-menu-in mt-1 border-t border-border pt-1">
                      <div className="flex items-center gap-2.5 px-2.5 py-1.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                          <Phone size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Phone
                          </p>
                          <p className="truncate text-sm font-medium leading-5 text-foreground">
                            {profile?.phone ?? "—"}
                          </p>
                        </div>
                      </div>

                      {user.role === "ADMIN" ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setSettingsOpen(false);
                            onMobileClose();
                            void navigate(ROUTES.adminRoles);
                          }}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Shield size={16} />
                          Roles & Permissions
                        </button>
                      ) : null}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setSettingsOpen(false);
                          onMobileClose();
                          void navigate(ROUTES.updateProfile);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <User size={16} />
                        Update Profile
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={cnProfileRow(collapsed)}>
              <button
                type="button"
                onClick={() => {
                  if (collapsed && window.matchMedia("(min-width: 1024px)").matches) return;
                  setMenuOpen((current) => {
                    const next = !current;
                    if (!next) setSettingsOpen(false);
                    return next;
                  });
                }}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Open HR profile menu"
                title={collapsed ? "Expand sidebar to view profile" : undefined}
                className={cnProfileButton(collapsed)}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary transition-transform group-hover:scale-105">
                  {initials(user.name)}
                </div>
                <div className={`min-w-0 flex-1 text-left ${collapsed ? "lg:hidden" : ""}`}>
                  <p className="truncate text-[13px] font-semibold text-sidebar-foreground">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] font-medium text-sidebar-muted">
                    {formatRole(user.role)}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-sidebar-muted transition-transform duration-200 ${collapsed ? "lg:hidden" : ""} ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(false);
                  onMobileClose();
                  onLogout();
                }}
                title="Log out"
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-danger transition-colors duration-200 hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

function cnBrand(collapsed: boolean): string {
  return `flex min-w-0 items-center gap-2.5 transition-all duration-300 ${
    collapsed ? "lg:justify-center lg:gap-0" : ""
  }`;
}

function cnBrandText(collapsed: boolean): string {
  return `overflow-hidden whitespace-nowrap transition-all duration-300 w-[120px] opacity-100 ${
    collapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : ""
  }`;
}

function cnProfileRow(collapsed: boolean): string {
  return `flex items-center gap-1 transition-all duration-300 ${
    collapsed ? "lg:flex-col lg:gap-1" : ""
  }`;
}

function cnProfileButton(collapsed: boolean): string {
  return `group flex min-w-0 flex-1 cursor-pointer items-center rounded-lg p-1.5 transition-colors duration-150 hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    collapsed ? "lg:justify-center lg:p-1 lg:gap-0" : "gap-2"
  }`;
}

function SidebarLeafItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavLeafItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  if (item.comingSoon || !item.to) {
    return (
      <span
        title={item.label}
        className={`
          flex h-9 cursor-not-allowed items-center rounded-lg text-[13px] font-medium text-sidebar-muted
          ${collapsed ? "gap-3 px-3 lg:justify-center lg:px-0" : "gap-2.5 px-2.5"}
        `}
      >
        <span className="shrink-0 text-sidebar-muted/50" aria-hidden="true">
          <Icon size={16} />
        </span>
        <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>
          {item.label}
        </span>
        <span
          className={`rounded bg-sidebar-hover px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sidebar-muted ${collapsed ? "lg:hidden" : ""}`}
        >
          Soon
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={item.label}
      className={({ isActive }) => `
        group relative flex h-9 cursor-pointer items-center rounded-lg border border-transparent text-[13px] font-medium transition-all duration-150
        ${collapsed ? "gap-3 px-3 lg:justify-center lg:px-0" : "gap-2.5 px-2.5"}
        ${isActive ? "border-primary/30 bg-primary-soft text-primary shadow-[0_3px_10px_-8px_hsl(var(--primary))]" : "text-sidebar-muted hover:border-primary/15 hover:bg-sidebar-hover hover:text-sidebar-foreground"}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      `}
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
              aria-hidden="true"
            />
          ) : null}
          <span
            className={`shrink-0 ${isActive ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"}`}
            aria-hidden="true"
          >
            <Icon size={16} />
          </span>
          <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
