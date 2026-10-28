/**
 * Utility functions for handling payment amounts.
 *
 * Payment verification API (/api/payment/verify) returns amounts in Rupees (e.g. 98000.00).
 * If a value is already a number or numeric string, it represents the rupee amount.
 */
export function normalizeAmountToRupees(val: number | string | null | undefined): number {
  if (val == null || val === '') return 0
  const num = Number(val)
  return isNaN(num) ? 0 : num
}

/**
 * Formats an amount to Indian Rupee currency string (e.g. "₹30,000" or "₹190.50").
 */
export function formatRupees(val: number | string | null | undefined): string {
  const rupees = normalizeAmountToRupees(val)
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}
