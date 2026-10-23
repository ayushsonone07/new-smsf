/**
 * Date helpers for the HR API.
 *
 *   SEND to API:        DD/MM/YYYY string  (toApiDate)
 *   RECEIVE from API:   ISO-8601 UTC       (fromIsoUtc)
 *   Daily-series keys:  YYYY-MM-DD         (parseDailyDate)
 *
 * All parsers return `null` on bad input so call sites can render "—" instead
 * of crashing or showing an Invalid Date.
 */

const pad = (n: number): string => n.toString().padStart(2, "0");

/** Format a Date as DD/MM/YYYY for an API query param. */
export function toApiDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Parse a DD/MM/YYYY string back to a Date (local time). Returns null if invalid. */
export function fromApiDate(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m === null) return null;
  const dd = m[1];
  const mm = m[2];
  const yyyy = m[3];
  if (dd === undefined || mm === undefined || yyyy === undefined) return null;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse an ISO-8601 UTC string. Returns null if missing/invalid. */
export function fromIsoUtc(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse a YYYY-MM-DD daily-series date (treated as local midnight for plotting). */
export function parseDailyDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m === null) return null;
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];
  if (yyyy === undefined || mm === undefined || dd === undefined) return null;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}
