import { Fragment, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  LogIn,
  Pencil,
  RotateCw,
  Trash2,
} from 'lucide-react'
import type { Department } from '../../features/departments/types/department.types'
import { DepartmentRoutesDropdown } from '../../features/departments/components/DepartmentRoutesDropdown'
import './DepartmentTable.css'

export interface EnrichedDepartment {
  id: string
  department: Department
  type: string
  label: string
  code: string
  headName: string
  headEmail: string
  userCount: number
  customers: number
  completionPercent: number
  delayed: number
  status: 'ACTIVE' | 'INACTIVE'
  visual: { initial: string; bg: string }
}

interface DepartmentTableProps {
  departments: EnrichedDepartment[]
  onEdit: (department: Department) => void
  onDelete?: (department: Department) => void
  onViewFeatures: (department: Department) => void
  onViewDashboard: (department: Department) => void
  onToggleStatus?: (department: Department) => void
  loggingInId?: string | null
}

const numberFormat = new Intl.NumberFormat('en-IN')

export function DepartmentTable({
  departments,
  onEdit,
  onDelete,
  onViewFeatures: _onViewFeatures,
  onViewDashboard,
  onToggleStatus,
  loggingInId = null,
}: DepartmentTableProps) {
  const [expandedDepartmentId, setExpandedDepartmentId] = useState<string | null>(null)

  if (departments.length === 0) {
    return (
      <div className="dept-table-empty">
        <p className="text-sm font-semibold text-slate-700">No departments found</p>
        <p className="text-xs text-slate-400 mt-1">Try changing your search or create a new department.</p>
      </div>
    )
  }

  return (
    <div className="dept-table-container">
      <table className="dept-table">
        <thead>
          <tr>
            <th className="dept-th-expand" aria-label="Expand" />
            <th className="dept-th-dept">DEPARTMENT</th>
            <th className="dept-th-head">DEPARTMENT HEAD</th>
            <th className="dept-th-login" aria-label="Login" />
            <th className="dept-th-users">USERS</th>
            <th className="dept-th-customers">CUSTOMERS</th>
            <th className="dept-th-completion">COMPLETION</th>
            <th className="dept-th-delayed">DELAYED</th>
            <th className="dept-th-active">ACTIVE</th>
            <th className="dept-th-actions">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((item) => {
            const isExpanded = expandedDepartmentId === item.id
            const isLoggingIn = loggingInId === item.id
            const isActive = item.status === 'ACTIVE'
            const pct = item.completionPercent
            const barColor =
              pct > 60 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-slate-300'

            return (
              <Fragment key={item.id}>
                <tr className={`dept-row ${isExpanded ? 'is-expanded' : ''}`}>
                  {/* 1. Expand Chevron */}
                  <td className="dept-td-expand">
                    <button
                      type="button"
                      className="dept-expand-chevron-btn"
                      onClick={() =>
                        setExpandedDepartmentId((curr) => (curr === item.id ? null : item.id))
                      }
                      title={isExpanded ? 'Collapse' : 'Expand routes'}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </td>

                  {/* 2. Department Name & Code */}
                  <td className="dept-td-dept">
                    <div className="flex items-center gap-3">
                      <div className={`dept-avatar-badge ${item.visual.bg}`}>
                        {item.visual.initial}
                      </div>
                      <div className="min-w-0">
                        <div className="dept-title-text">{item.label}</div>
                        <div className="dept-code-text">{item.code}</div>
                      </div>
                    </div>
                  </td>

                  {/* 3. Department Head */}
                  <td className="dept-td-head">
                    <div className="min-w-0">
                      <div className="dept-head-name-text">{item.headName}</div>
                      <div className="dept-head-email-text truncate" title={item.headEmail}>
                        {item.headEmail || 'No email provided'}
                      </div>
                    </div>
                  </td>

                  {/* 4. Login as Department Head Button */}
                  <td className="dept-td-login">
                    <button
                      type="button"
                      className="dept-row-login-btn"
                      onClick={() => onViewDashboard(item.department)}
                      disabled={isLoggingIn || !item.headEmail}
                      title={item.headEmail ? `Login as ${item.headName}` : 'No email available'}
                      aria-label={`Login as ${item.headName}`}
                    >
                      {isLoggingIn ? (
                        <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      ) : (
                        <LogIn className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </button>
                  </td>

                  {/* 5. Users Count */}
                  <td className="dept-td-users">
                    <span className="dept-stat-num">{item.userCount}</span>
                  </td>

                  {/* 6. Customers Count */}
                  <td className="dept-td-customers">
                    <span className="dept-stat-num">{numberFormat.format(item.customers)}</span>
                  </td>

                  {/* 7. Completion Rate */}
                  <td className="dept-td-completion">
                    <div className="dept-completion-wrap">
                      <div className="dept-progress-track">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="dept-completion-pct">
                        {item.customers === 0 ? '—' : `${pct}%`}
                      </span>
                    </div>
                  </td>

                  {/* 8. Delayed Pill */}
                  <td className="dept-td-delayed">
                    {item.delayed > 0 ? (
                      <span className="dept-delayed-badge-red">
                        {numberFormat.format(item.delayed)}
                      </span>
                    ) : (
                      <span className="dept-delayed-badge-gray">0</span>
                    )}
                  </td>

                  {/* 9. Active Toggle Switch */}
                  <td className="dept-td-active">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      className={`dept-toggle-switch ${isActive ? 'is-active' : ''}`}
                      onClick={() => onToggleStatus?.(item.department)}
                      title={`Status: ${item.status}. Click to toggle.`}
                    >
                      <span className="dept-toggle-thumb" />
                    </button>
                  </td>

                  {/* 10. Actions: Edit (Pencil) & Delete (Trash2) */}
                  <td className="dept-td-actions">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        className="dept-action-icon-btn"
                        onClick={() => onEdit(item.department)}
                        title="Edit Department"
                        aria-label={`Edit ${item.label}`}
                      >
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </button>

                      <button
                        type="button"
                        className="dept-action-icon-btn is-delete"
                        onClick={() => onDelete?.(item.department)}
                        title="Delete Department"
                        aria-label={`Delete ${item.label}`}
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded Route Permissions Row */}
                {isExpanded && (
                  <tr className="dept-routes-expanded-row">
                    <td colSpan={10} className="p-0">
                      <div className="dept-routes-expanded-container">
                        {item.type ? (
                          <DepartmentRoutesDropdown departmentType={item.type} />
                        ) : (
                          <p className="text-xs text-slate-500 p-3">
                            This department does not have a department type configured.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
