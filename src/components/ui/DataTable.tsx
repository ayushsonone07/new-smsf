import type { ReactNode } from 'react'

export interface DataTableColumn<
  Row = unknown,
> {
  key: string
  title: ReactNode
  className?: string
  /** Cell renderer — required when using `rows`. */
  render?: (row: Row, index: number) => ReactNode
  width?: string
}

interface DataTableBaseProps<Row> {
  columns: DataTableColumn<Row>[]
  className?: string
}

interface DataTableChildrenProps<Row>
  extends DataTableBaseProps<Row> {
  /** Legacy mode — caller renders <tr> rows itself. */
  children: ReactNode
  rows?: never
  rowKey?: never
  emptyState?: never
}

interface DataTableRowsProps<Row>
  extends DataTableBaseProps<Row> {
  /** Declarative mode — rows rendered via column.render. */
  rows: Row[]
  rowKey: (row: Row, index: number) => string
  emptyState?: ReactNode
  children?: never
}

type DataTableProps<Row> =
  | DataTableChildrenProps<Row>
  | DataTableRowsProps<Row>

/**
 * Plain table shell. Two ways to use it:
 *
 * 1. `columns` + `children` (you write the <tr>s)
 * 2. `columns` (with render) + `rows` + `rowKey`
 */
export function DataTable<Row>(
  props: DataTableProps<Row>,
) {
  const { columns, className } = props

  const wrapperClasses = ['table-wrapper', className]
    .filter(Boolean)
    .join(' ')

  let body: ReactNode

  if ('rows' in props && props.rows) {
    const { rows, rowKey, emptyState } = props

    body =
      rows.length === 0 && emptyState ? (
        <tr>
          <td
            colSpan={columns.length}
            className="table-empty-cell"
          >
            {emptyState}
          </td>
        </tr>
      ) : (
        rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={column.className}
              >
                {column.render
                  ? column.render(row, index)
                  : null}
              </td>
            ))}
          </tr>
        ))
      )
  } else {
    body = props.children
  }

  return (
    <div className={wrapperClasses}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.className}
                style={
                  column.width
                    ? { width: column.width }
                    : undefined
                }
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>{body}</tbody>
      </table>
    </div>
  )
}
