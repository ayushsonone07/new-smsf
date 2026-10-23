import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { createPortal } from "react-dom";

import { hrService } from "@features/hr";
import type { EmployeeListItem } from "@features/hr";
import { getApiErrorMessage } from "@shared/lib";

import { cn } from "@hrm/lib/utils";

interface EmployeeSelectProps {
  value: number | "";
  onChange: (employeeId: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EmployeeSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select employee",
}: EmployeeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, width: 0, opensAbove: false });

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    let active = true;
    if (!open) return;
    setLoading(true);
    setError(null);
    hrService
      .listEmployees({ page: 0, size: 100, q: query.trim() || undefined, sort: "createdAt,desc" })
      .then(({ items }) => {
        if (active) setOptions(items);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, "Could not load employees."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, query]);

  useEffect(() => {
    if (open) {
      setActiveIndex(-1);
      const timer = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target))
        setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = Math.max(rect.width, 320);
      const menuHeight = 320;
      const opensAbove = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
      setPopoverPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12)),
        top: opensAbove ? rect.top - 8 : rect.bottom + 8,
        width: menuWidth,
        opensAbove,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function selectEmployee(employee: EmployeeListItem) {
    onChange(employee.id);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) selectEmployee(option);
    }
  }

  return (
    <div ref={rootRef} className="w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-left text-sm text-foreground shadow transition-colors focus:border-input focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-border bg-surface-elevated text-foreground",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate text-foreground", !selected && "text-muted-foreground")}>
          {selected ? `${selected.name} (${selected.employeeCode})` : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              aria-label={placeholder}
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
                width: popoverPosition.width,
                transform: popoverPosition.opensAbove ? "translateY(-100%)" : undefined,
              }}
              className="mbg-popover-in fixed z-[80] max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by name or code…"
                  className="w-full rounded-xl border border-border bg-surface-elevated py-2.5 pl-9 pr-3 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error ? (
                <p className="px-3 py-3 text-xs text-danger">{error}</p>
              ) : loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading employees…
                </div>
              ) : options.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No employees match your search.</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {options.map((employee, index) => {
                    const isActive = index === activeIndex;
                    const isSelected = employee.id === value;
                    return (
                      <li key={employee.id}>
                        <button
                          ref={isActive ? activeOptionRef : undefined}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => selectEmployee(employee)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl bg-transparent px-3 py-2.5 text-left text-sm transition-colors",
                            isActive && "text-primary",
                            isSelected && "font-semibold text-primary",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{employee.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {employee.employeeCode}
                              {employee.departmentName ? ` · ${employee.departmentName}` : ""}
                            </span>
                          </span>
                          {isSelected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}