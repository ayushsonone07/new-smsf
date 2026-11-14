import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@hrm/lib/utils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

/** A consistent, portal-based date picker with Month/Year selectors and manual date entry. */
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
  const [manualText, setManualText] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, opensAbove: false });
  const selectedDate = value ? parseDateInput(value) : null;
  const calendarDays = getCalendarDays(visibleMonth);

  const currentYear = new Date().getFullYear();
  const minYear = min ? Number(min.slice(0, 4)) : 1930;
  const maxYear = max ? Number(max.slice(0, 4)) : currentYear + 15;

  const years = useMemo(() => {
    const startYear = Math.max(maxYear, visibleMonth.getFullYear());
    const endYear = Math.min(minYear, visibleMonth.getFullYear());
    const list: number[] = [];
    for (let y = startYear; y >= endYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear, visibleMonth]);

  useEffect(() => {
    if (value) setVisibleMonth(startOfMonth(parseDateInput(value)));
  }, [value]);

  useEffect(() => {
    if (open) {
      setManualText(value || "");
      setManualError(null);
    }
  }, [open, value]);

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
      const menuHeight = 460;
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
    const formatted = toDateInput(nextDate);
    onChange(formatted);
    setOpen(false);
  }

  function handleApplyManual() {
    const raw = manualText.trim();
    if (!raw) {
      onChange("");
      setOpen(false);
      return;
    }
    const parsed = parseManualDateString(raw);
    if (!parsed) {
      setManualError("Enter a valid date (e.g. 15/08/2005 or 2005-08-15)");
      return;
    }
    const formatted = toDateInput(parsed);
    if (min && formatted < min) {
      setManualError(`Date cannot be earlier than ${min}`);
      return;
    }
    if (max && formatted > max) {
      setManualError(`Date cannot be later than ${max}`);
      return;
    }
    onChange(formatted);
    setVisibleMonth(startOfMonth(parsed));
    setManualError(null);
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
              {/* Header with Quick Month & Year Dropdowns + Nav Buttons */}
              <div className="mb-3 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={visibleMonth.getMonth()}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value);
                      setVisibleMonth(new Date(visibleMonth.getFullYear(), newMonth, 1));
                    }}
                    aria-label="Select month"
                    className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={visibleMonth.getFullYear()}
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      setVisibleMonth(new Date(newYear, visibleMonth.getMonth(), 1));
                    }}
                    aria-label="Select year"
                    className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`} className="py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
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

              {/* Manual Date Input Option */}
              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Or enter date manually:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => {
                      setManualText(e.target.value);
                      if (manualError) setManualError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyManual();
                      }
                    }}
                    placeholder="e.g. 15/08/2005 or 2005-08-15"
                    className={cn(
                      "flex-1 rounded-lg border px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2",
                      manualError
                        ? "border-red-400 bg-red-50/30 text-red-700 focus:ring-red-200"
                        : "border-slate-200 bg-slate-50/50 focus:border-sky-400 focus:bg-white focus:ring-sky-100",
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleApplyManual}
                    className="shrink-0 rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    Set
                  </button>
                </div>
                {manualError ? (
                  <p className="mt-1 text-[11px] font-medium text-red-500">{manualError}</p>
                ) : null}
              </div>

              {/* Clear and Today Actions */}
              <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setManualText("");
                    setManualError(null);
                    setOpen(false);
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => selectDate(new Date())}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-sky-700 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
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

function parseManualDateString(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (isValidDateParts(year, month, day)) {
      return new Date(year, month - 1, day);
    }
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (isValidDateParts(year, month, day)) {
      return new Date(year, month - 1, day);
    }
  }

  // 3. String date parse e.g. "15 Aug 2005"
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
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

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
