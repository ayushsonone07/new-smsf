import type { SelectHTMLAttributes } from 'react'

export type SelectProps =
  SelectHTMLAttributes<HTMLSelectElement>

export function Select({
  className,
  ...props
}: SelectProps) {
  return <select className={className} {...props} />
}
