/**
 * Utility functions for handling payment amounts.
 *
 * Normalizes an amount from DB/API to Rupees:
 * - If separated by '.' (e.g. "30000.00", "190.50", or float with decimal):
 *   it is already in Rupees, so return the full amount.
 * - If not separated by '.' (e.g. 3000000, "3000000", 19000):
 *   it is in Paise, so convert into Rupees by dividing by 100.
 */
export function normalizeAmountToRupees(val: number | string | null | undefined): number {
  if (val == null || val === '') return 0
  const rawStr = String(val).trim()
  const num = Number(rawStr)
  if (isNaN(num)) return 0

  // If separated by '.', it is already in Rupees (e.g. "30000.00" -> 30000)
  if (rawStr.includes('.')) {
    return num
  }

  // If not separated by '.', it is clear in paise (e.g. 3000000 -> 30000), convert to rupees
  return num / 100
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

