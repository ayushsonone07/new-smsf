import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";

import type { NavGroupItem } from "@features/dashboard";

interface SidebarNavGroupProps {
  group: NavGroupItem;
  expanded: boolean;
  collapsed: boolean;
  isAnyChildActive: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

function groupPanelId(label: string): string {
  return `sidebar-group-${label.replace(/\s+/g, "-").toLowerCase()}`;
}

export function SidebarNavGroup({
  group,
  expanded,
  collapsed,
  isAnyChildActive,
  onToggle,
  onNavigate,
}: SidebarNavGroupProps) {
  const Icon = group.icon;
  const panelId = groupPanelId(group.label);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={group.label}
        title={group.label}
        className={`
          flex h-9 w-full cursor-pointer items-center justify-center rounded-lg
          text-[13px] font-medium transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          border border-transparent ${isAnyChildActive ? "border-primary/30 bg-primary-soft text-primary shadow-[0_3px_10px_-8px_hsl(var(--primary))]" : "text-sidebar-muted hover:border-primary/15 hover:bg-sidebar-hover hover:text-sidebar-foreground"}
        `}
      >
        <span className="shrink-0" aria-hidden="true">
          <Icon size={16} />
        </span>
      </button>
    );
  }

  return (
      <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={`
          group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5
          text-[13px] font-medium transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          border border-transparent ${isAnyChildActive ? "border-primary/30 bg-primary-soft text-primary shadow-[0_3px_10px_-8px_hsl(var(--primary))]" : "text-sidebar-muted hover:border-primary/15 hover:bg-sidebar-hover hover:text-sidebar-foreground"}
        `}
      >
        <span
          className={`shrink-0 ${isAnyChildActive ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"}`}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-sidebar-muted transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-0" : "-rotate-90"}`}
          aria-hidden="true"
        />
      </button>

      <motion.div
        id={panelId}
        role="region"
        aria-label={`${group.label} sub-navigation`}
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div className="overflow-hidden">
          <ul className="ml-3 space-y-1 border-l border-sidebar-border pl-3">
            {group.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <li key={child.label}>
                  {child.comingSoon || !child.to ? (
                    <span className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-sidebar-muted">
                      <span className="shrink-0 text-sidebar-muted/50" aria-hidden="true">
                        <ChildIcon size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{child.label}</span>
                      <span className="rounded bg-sidebar-hover px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sidebar-muted">
                        Soon
                      </span>
                    </span>
                  ) : (
                    <NavLink
                      to={child.to}
                      onClick={onNavigate}
                      className={({ isActive }) => `
                        group flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5
                        text-[13px] font-medium transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                        border border-transparent ${isActive ? "border-primary/25 bg-primary-soft text-primary" : "text-sidebar-muted hover:border-primary/15 hover:bg-sidebar-hover hover:text-sidebar-foreground"}
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`shrink-0 ${isActive ? "text-primary" : "text-sidebar-muted"}`}
                            aria-hidden="true"
                          >
                            <ChildIcon size={15} />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{child.label}</span>
                        </>
                      )}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
