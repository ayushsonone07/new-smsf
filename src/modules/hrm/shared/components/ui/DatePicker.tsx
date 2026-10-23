import { useEffect, useRef, useState } from "react";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@hrm/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  min?: string | undefined;
  max?: string | undefined;
  required?: boolean | undefined;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
}

/** A consistent, portal-based date picker that stays visible inside dialogs and tables. */
export function DatePicker({
  value,
  onChange,
  id,
  disabled = false,
  min,
  max,
  required = false,
  ariaLabel = "Choose date",
  placeholder = "Select date",
  className,
  buttonClassName,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(value ? parseDateInput(value) : new Date()),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, opensAbove: false });
  const selectedDate = value ? parseDateInput(value) : null;
  const calendarDays = getCalendarDays(visibleMonth);

  useEffect(() => {
    if (value) setVisibleMonth(startOfMonth(parseDateInput(value)));
  }, [value]);

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
      const menuWidth = 320;
      const menuHeight = 410;
      const opensAbove = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
      setPopoverPosition({
        left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
        top: opensAbove ? rect.top - 8 : rect.bottom + 8,
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

  function selectDate(nextDate: Date) {
    onChange(toDateInput(nextDate));
    setOpen(false);
  }

  function isUnavailable(day: Date) {
    const dateValue = toDateInput(day);
    return Boolean((min && dateValue < min) || (max && dateValue > max));
  }

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 shadow transition-all hover:border-sky-200 hover:bg-sky-50/60 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-sky-300 bg-sky-50/60 shadow-[0_8px_18px_rgba(14,116,144,0.10)]",
          buttonClassName,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" />
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-slate-400")}>
          {value ? formatPickerDate(value) : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180 text-sky-600",
          )}
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Date picker"
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
                transform: popoverPosition.opensAbove ? "translateY(-100%)" : undefined,
              }}
              className="mbg-popover-in fixed z-[80] w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <p className="text-sm font-bold text-slate-800">{formatMonthYear(visibleMonth)}</p>
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`} className="py-1">
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-y-1">
                {calendarDays.map((day) => {
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                  const unavailable = isUnavailable(day);
                  return (
                    <button
                      key={toDateInput(day)}
                      type="button"
                      disabled={unavailable}
                      onClick={() => selectDate(day)}
                      aria-label={formatFullDate(day)}
                      aria-pressed={isSelected}
                      className={cn(
                        "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-30",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow"
                          : isToday
                            ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                            : isCurrentMonth
                              ? "text-slate-700 hover:bg-slate-100"
                              : "text-slate-300 hover:bg-slate-50",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => selectDate(new Date())}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function parseDateInput(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date) {
  const firstVisibleDate = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisibleDate);
    day.setDate(firstVisibleDate.getDate() + index);
    return day;
  });
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatPickerDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDateInput(date));
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
