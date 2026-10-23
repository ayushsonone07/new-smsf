import { useEffect, useRef, useState, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@hrm/lib/utils";

export interface DateRangeValue {
  from: string;
  to: string;
}

interface PresetOption {
  label: string;
  value: "last24" | "last7" | "last30" | "custom";
}

const PRESETS: PresetOption[] = [
  { label: "Last 24 hours", value: "last24" },
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
  { label: "Custom Range", value: "custom" },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseInputDate(dateStr: string): Date {
  const [year = 1970, month = 1, day = 1] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function normalizeRange(from: string, to: string): { from: string; to: string } {
  if (!from && !to) return { from: "", to: "" };
  if (!from) return { from: "", to };
  if (!to) return { from, to: "" };

  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);

  if (fromDate <= toDate) {
    return { from, to };
  }

  return {
    from: formatInputDate(toDate),
    to: formatInputDate(fromDate),
  };
}

function getPresetByRange(from: string, to: string): "last24" | "last7" | "last30" | "custom" {
  if (!from || !to) return "custom";

  const start = parseInputDate(from);
  const end = parseInputDate(to);
  const now = startOfDay(new Date());
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && isSameDay(start, now)) return "last24";
  if (diffDays === 6 && isSameDay(end, now)) return "last7";
  if (diffDays === 29 && isSameDay(end, now)) return "last30";

  return "custom";
}

function getCalendarDays(month: Date): Date[] {
  const firstVisibleDate = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisibleDate);
    day.setDate(firstVisibleDate.getDate() + index);
    return day;
  });
}

function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isBeforeDay(first: Date, second: Date): boolean {
  const f = startOfDay(first);
  const s = startOfDay(second);
  return f < s;
}

function isAfterDay(first: Date, second: Date): boolean {
  const f = startOfDay(first);
  const s = startOfDay(second);
  return f > s;
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDisplayDate(dateStr: string): string {
  const date = parseInputDate(dateStr);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface DateRangePickerPopupProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  onApply?: (value: DateRangeValue) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
}

export function DateRangePickerPopup({
  value,
  onChange,
  onApply,
  disabled = false,
  placeholder = "Select Date",
  className,
  buttonClassName,
}: DateRangePickerPopupProps) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<"last24" | "last7" | "last30" | "custom" | null>(
    () => getPresetByRange(value.from, value.to)
  );

  const [tempFrom, setTempFrom] = useState<string>(value.from);
  const [tempTo, setTempTo] = useState<string>(value.to);
  const [leftMonth, setLeftMonth] = useState(() =>
    startOfMonth(value.from ? parseInputDate(value.from) : new Date())
  );
  const rightMonth = useMemo(
    () => new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1),
    [leftMonth]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, opensAbove: false });

  const fromDate = tempFrom ? parseInputDate(tempFrom) : null;
  const toDate = tempTo ? parseInputDate(tempTo) : null;

  const leftCalendarDays = getCalendarDays(leftMonth);
  const rightCalendarDays = getCalendarDays(rightMonth);

  useEffect(() => {
    setTempFrom(value.from);
    setTempTo(value.to);
    setSelectedPreset(getPresetByRange(value.from, value.to));
  }, [value.from, value.to]);

  useEffect(() => {
    if (!open) return;
    if (tempFrom) setLeftMonth(startOfMonth(parseInputDate(tempFrom)));
  }, [open, tempFrom]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
        setTempFrom(value.from);
        setTempTo(value.to);
        setSelectedPreset(() => getPresetByRange(value.from, value.to));
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setTempFrom(value.from);
        setTempTo(value.to);
      }
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, value.from, value.to]);

useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = 420;
      const popupHeight = 520;
      // Center the popup in the viewport
      const left = Math.max(12, Math.min(viewportWidth - popupWidth - 12, viewportWidth / 2 - popupWidth / 2));
      const top = Math.max(12, Math.min(viewportHeight - popupHeight - 12, viewportHeight / 2 - popupHeight / 2));
      setPopoverPosition({
        left,
        top,
        opensAbove: false,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, value.from, value.to]);

  function handlePresetClick(preset: PresetOption["value"]) {
    const now = startOfDay(new Date());
    let newFrom: Date;
    let newTo: Date;

    switch (preset) {
      case "last24":
        newFrom = startOfDay(addDays(now, -1));
        newTo = now;
        break;
      case "last7":
        newFrom = startOfDay(addDays(now, -6));
        newTo = now;
        break;
      case "last30":
        newFrom = startOfDay(addDays(now, -29));
        newTo = now;
        break;
      case "custom":
        newFrom = tempFrom ? parseInputDate(tempFrom) : now;
        newTo = tempTo ? parseInputDate(tempTo) : now;
        break;
      default:
        return;
    }

    const nextFrom = formatInputDate(newFrom);
    const nextTo = formatInputDate(newTo);
    const normalized = normalizeRange(nextFrom, nextTo);

    setTempFrom(normalized.from);
    setTempTo(normalized.to);
    setSelectedPreset(preset);
  }

  function selectDay(day: Date) {
    const nextValue = formatInputDate(day);

    if (!tempFrom || tempTo) {
      const nextRange = { from: nextValue, to: "" };
      setTempFrom(nextRange.from);
      setTempTo(nextRange.to);
      setSelectedPreset("custom");
      return;
    }

    const normalized = normalizeRange(tempFrom, nextValue);
    const nextRange = { from: normalized.from, to: normalized.to };
    setTempFrom(nextRange.from);
    setTempTo(nextRange.to);
    setSelectedPreset("custom");
  }

  function isSelectedStart(day: Date): boolean {
    return fromDate ? isSameDay(day, fromDate) : false;
  }

  function isSelectedEnd(day: Date): boolean {
    return toDate ? isSameDay(day, toDate) : false;
  }

  function isInRange(day: Date): boolean {
    if (!fromDate || !toDate) return false;
    return !isBeforeDay(day, fromDate) && !isAfterDay(day, toDate);
  }

  function handleApply() {
    const normalized = normalizeRange(tempFrom, tempTo);
    setTempFrom(normalized.from);
    setTempTo(normalized.to);
    onChange({ from: normalized.from, to: normalized.to });

    if (onApply) {
      onApply({ from: normalized.from, to: normalized.to });
    }

    setSelectedPreset(getPresetByRange(normalized.from, normalized.to));
    setOpen(false);
  }

  function handleClear() {
    setTempFrom("");
    setTempTo("");
    setSelectedPreset("custom");
    onChange({ from: "", to: "" });
    setOpen(false);
  }

  function getDayClassName(day: Date, isLeftCalendar: boolean): string {
    const selectedStart = isSelectedStart(day);
    const selectedEnd = isSelectedEnd(day);
    const inRange = isInRange(day);
    const isCurrentMonth = day.getMonth() === (isLeftCalendar ? leftMonth : rightMonth).getMonth();
    const isToday = isSameDay(day, new Date());

    if (selectedStart && selectedEnd) {
      return "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow focus:outline-none focus:ring-2 focus:ring-primary/50";
    }
    if (selectedStart || selectedEnd) {
      return "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow focus:outline-none focus:ring-2 focus:ring-primary/50";
    }
    if (inRange) {
      return "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50";
    }
    if (isToday) {
      return "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold border border-primary/30 bg-primary-soft text-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/50";
    }
    if (!isCurrentMonth) {
      return "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm text-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-100";
    }
    return "mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-200";
  }

  const displayValue = useMemo(() => {
    if (!value.from && !value.to) return placeholder;
    if (value.from && value.to) {
      return `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`;
    }
    if (value.from) return `${formatDisplayDate(value.from)} -`;
    return `- ${formatDisplayDate(value.to)}`;
  }, [value.from, value.to, placeholder]);

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label="Open date range picker"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 shadow transition-all hover:border-sky-200 hover:bg-sky-50/60 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-sky-300 bg-sky-50/60 shadow-[0_8px_18px_rgba(14,116,144,0.10)]",
          buttonClassName,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" />
        <span className={cn("min-w-0 flex-1 truncate", !value.from && !value.to && "text-slate-400")}>
          {displayValue}
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
              aria-label="Date range picker"
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
                transform: popoverPosition.opensAbove ? "translateY(-100%)" : undefined,
              }}
              className="mbg-popover-in fixed z-[80] w-[min(100vw-1.5rem,860px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.18)] max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
                      <input
                        type="date"
                        value={tempFrom}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          const normalized = normalizeRange(newVal, tempTo);
                          setTempFrom(normalized.from);
                          setTempTo(normalized.to);
                          setSelectedPreset("custom");
                        }}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
                      <input
                        type="date"
                        value={tempTo}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          const normalized = normalizeRange(tempFrom, newVal);
                          setTempFrom(normalized.from);
                          setTempTo(normalized.to);
                          setSelectedPreset("custom");
                        }}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setLeftMonth(
                              (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                            )
                          }
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                          aria-label="Previous month"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <p className="text-sm font-bold text-slate-800">{formatMonthYear(leftMonth)}</p>
                        <div className="w-8" />
                      </div>
                      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                          <span key={`${day}-${index}`} className="py-1">
                            {day}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-y-1">
                        {leftCalendarDays.map((day) => (
                          <button
                            key={`L-${formatInputDate(day)}`}
                            type="button"
                            onClick={() => selectDay(day)}
                            aria-label={formatFullDate(day)}
                            aria-pressed={isSelectedStart(day) || isSelectedEnd(day)}
                            className={cn("transition", getDayClassName(day, true))}
                          >
                            {day.getDate()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-8" />
                        <p className="text-sm font-bold text-slate-800">{formatMonthYear(rightMonth)}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setLeftMonth(
                              (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
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
                          <span key={`${day}-${index}-r`} className="py-1">
                            {day}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-y-1">
                        {rightCalendarDays.map((day) => (
                          <button
                            key={`R-${formatInputDate(day)}`}
                            type="button"
                            onClick={() => selectDay(day)}
                            aria-label={formatFullDate(day)}
                            aria-pressed={isSelectedStart(day) || isSelectedEnd(day)}
                            className={cn("transition", getDayClassName(day, false))}
                          >
                            {day.getDate()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:block w-full lg:w-44 border-l border-slate-200 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Quick Ranges</p>
                  <div className="space-y-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handlePresetClick(preset.value)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all",
                          selectedPreset === preset.value
                            ? "border-orange-300 bg-orange-50 text-orange-600 shadow"
                            : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{preset.label}</span>
                          {selectedPreset === preset.value && <Check size={14} className="text-orange-500" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!tempFrom || !tempTo}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-primary shadow transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}