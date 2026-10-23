import { useState, type FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { DatePicker, Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { Select } from "@hrm/components/ui/select";

import { useApplyLeave, useLeaveBalances, useLeaveContext } from "../hooks";

import type { LeaveRequestInput, LeaveTypeValue } from "../types";

interface ApplyLeaveDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_WORKING_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const WEEKDAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function countChargeableDays(
  start: string,
  end: string,
  workingDays: string[],
  holidays: string[],
): number {
  const holidaySet = new Set(holidays);
  let count = 0;
  const cursor = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  while (cursor <= endDate) {
    if (
      workingDays.includes(WEEKDAY_NAMES[cursor.getDay()] ?? "") &&
      !holidaySet.has(toDateInput(cursor))
    )
      count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function ApplyLeaveDialog({ open, onClose }: ApplyLeaveDialogProps) {
  const [leaveType, setLeaveType] = useState<LeaveTypeValue | "">("");
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyLeave = useApplyLeave();
  const toast = useToast();
  const { data: balances } = useLeaveBalances();
  const { data: context } = useLeaveContext();

  const workingDays = context?.workingDays ?? DEFAULT_WORKING_DAYS;
  const holidays = context?.holidays ?? [];
  const numberOfDays = halfDay
    ? 0.5
    : countChargeableDays(startDate, endDate, workingDays, holidays);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!leaveType) errs.leaveType = "Leave type is required.";
    if (!startDate) errs.startDate = "Start date is required.";
    if (!endDate) errs.endDate = "End date is required.";
    if (startDate && startDate < todayString()) errs.startDate = "Leave cannot start in the past.";
    if (endDate && endDate < todayString()) errs.endDate = "Leave cannot start in the past.";
    if (halfDay && startDate && endDate && startDate !== endDate) {
      errs.endDate = "Half day leave must be for a single date.";
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = "End date cannot be before start date.";
    }
    if (!reason.trim()) errs.reason = "Reason is required.";
    if (reason.trim().length > 500) errs.reason = "Reason must be under 500 characters.";
    if (leaveType && balances) {
      const balance = balances.find((b) => b.leaveType === leaveType);
      if (balance && numberOfDays > balance.remaining) {
        errs.balance = `Insufficient balance. You have ${balance.remaining} day(s) remaining for ${balance.label}.`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const input: LeaveRequestInput = {
      leaveType: leaveType as LeaveTypeValue,
      startDate,
      endDate: halfDay ? startDate : endDate,
      halfDay,
      reason: reason.trim(),
    };
    applyLeave.mutate(input, {
      onSuccess: () => {
        toast.success("Leave application submitted successfully.");
        onClose();
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err, "Failed to submit leave application."));
      },
    });
  }

  const disabled = applyLeave.isPending;

  return (
    <Dialog open={open} onClose={onClose} title="Apply for Leave" size="md">
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div>
          <label
            htmlFor="leave-type"
            className="mb-1.5 block text-sm font-semibold text-foreground"
          >
            Leave Type <span className="text-danger">*</span>
          </label>
          <Select
            id="leave-type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveTypeValue)}
            disabled={disabled}
            className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            aria-invalid={!!errors.leaveType}
            aria-describedby={errors.leaveType ? "leave-type-error" : undefined}
          >
            <option value="">Select leave type</option>
            {balances?.map((b) => (
              <option key={b.leaveType} value={b.leaveType}>
                {`${b.label} (${b.remaining}/${b.total})`}
              </option>
            ))}
          </Select>
          {errors.leaveType ? (
            <p id="leave-type-error" className="mt-1 text-xs text-danger" role="alert">
              {errors.leaveType}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start-date"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              Start Date <span className="text-danger">*</span>
            </label>
            <DatePicker
              id="start-date"
              value={startDate}
              onChange={setStartDate}
              disabled={disabled}
              required
              min={todayString()}
              ariaLabel="Choose leave start date"
              buttonClassName="h-11 rounded-xl px-4 text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.startDate ? (
              <p id="start-date-error" className="mt-1 text-xs text-danger" role="alert">
                {errors.startDate}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              End Date <span className="text-danger">*</span>
            </label>
            <DatePicker
              id="end-date"
              value={endDate}
              onChange={setEndDate}
              disabled={disabled}
              required
              min={todayString()}
              ariaLabel="Choose leave end date"
              buttonClassName="h-11 rounded-xl px-4 text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.endDate ? (
              <p id="end-date-error" className="mt-1 text-xs text-danger" role="alert">
                {errors.endDate}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <span className="font-medium text-foreground">Number of days: </span>
          <span className="font-semibold text-foreground">{numberOfDays}</span>
          {errors.balance ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              {errors.balance}
            </p>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-elevated px-4 py-3">
          <span className="text-sm font-medium text-foreground">Half-day leave</span>
          <input
            type="checkbox"
            checked={halfDay}
            onChange={(e) => {
              setHalfDay(e.target.checked);
              if (e.target.checked) setEndDate(startDate);
            }}
            disabled={disabled}
            className="h-5 w-5 cursor-pointer accent-primary"
          />
        </label>

        <div>
          <label htmlFor="reason" className="mb-1.5 block text-sm font-semibold text-foreground">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={disabled}
            rows={3}
            maxLength={500}
            placeholder="Please provide a reason for your leave request."
            className="block w-full resize-none rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground shadow transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            aria-invalid={!!errors.reason}
            aria-describedby={errors.reason ? "reason-error" : undefined}
          />
          {errors.reason ? (
            <p id="reason-error" className="mt-1 text-xs text-danger" role="alert">
              {errors.reason}
            </p>
          ) : null}
          <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/500</p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="cursor-pointer rounded-xl border border-border bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-foreground shadow transition-all hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled ? <Loader2 size={16} className="animate-spin" /> : null}
            {disabled ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
