import type { ReactNode } from 'react'

interface DataTableColumn {
  key: string
  title: ReactNode
  className?: string
}

interface DataTableProps {
  columns: DataTableColumn[]
  children: ReactNode
}

export function DataTable({
  columns,
  children,
}: DataTableProps) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.className}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
