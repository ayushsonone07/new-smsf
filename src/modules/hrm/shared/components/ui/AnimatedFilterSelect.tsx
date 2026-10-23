import { useEffect, useId, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "@hrm/lib/utils";

export interface AnimatedFilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "warning";
}

interface AnimatedFilterSelectProps {
  value: string;
  options: AnimatedFilterOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  leadingIcon?: LucideIcon;
}

const optionTone = {
  default: "text-foreground hover:text-primary",
  accent: "text-info hover:text-primary",
  warning: "text-warning hover:text-primary",
} as const;

/** A keyboard-accessible, animated dropdown for filter controls. */
export function AnimatedFilterSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
  disabled = false,
  leadingIcon: LeadingIcon,
}: AnimatedFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
  }, []);

  function selectOption(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0", open && "z-[70]", className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "group flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-surface-elevated px-3 text-left text-sm font-medium text-foreground shadow transition-all duration-150 hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-input bg-surface-elevated text-foreground",
        )}
      >
        {LeadingIcon ? (
          <LeadingIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-foreground">{selected?.label ?? "Select"}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full z-[80] mt-1 max-h-72 w-full min-w-[12rem] origin-top overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl bg-transparent px-3 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "font-semibold text-primary"
                      : optionTone[option.tone ?? "default"],
                  )}
                >
                  {Icon ? (
                    <Icon className="h-4 w-4 shrink-0 opacity-75" />
                  ) : (
                    <span className="h-4 w-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
