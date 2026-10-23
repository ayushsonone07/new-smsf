import { DatePicker } from "./DatePicker";

export interface DateRangeValue {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  disabled?: boolean;
  className?: string;
  fromLabel?: string;
  toLabel?: string;
}

/** A reusable pair of linked date pickers for filtering reports and lists by a date range. */
export function DateRangePicker({
  value,
  onChange,
  disabled = false,
  className,
  fromLabel = "From date",
  toLabel = "To date",
}: DateRangePickerProps) {
  return (
    <div className={className ?? "grid gap-3 sm:grid-cols-2"}>
      <DatePicker
        value={value.from}
        onChange={(from) => onChange({ from, to: value.to && value.to < from ? "" : value.to })}
        max={value.to || undefined}
        disabled={disabled}
        ariaLabel={fromLabel}
        placeholder={fromLabel}
      />
      <DatePicker
        value={value.to}
        onChange={(to) => onChange({ from: value.from, to })}
        min={value.from || undefined}
        disabled={disabled}
        ariaLabel={toLabel}
        placeholder={toLabel}
      />
    </div>
  );
}
