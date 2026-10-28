export const formatCurrency = (amount: number | null | undefined) =>
  amount === null || amount === undefined ? '—' : `₹${Number(amount).toLocaleString('en-IN')}`

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
