import { useMemo, useState, type FormEvent } from 'react'
import {
  Compass,
  Plus,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ScrollableSelect } from '../ui/ScrollableSelect'
import {
  useDepartmentTypes,
  useCreateDynamicRoute,
} from '../../features/permissions/hooks/useDynamicPermissions'
import { normalizeInputRoute } from '../../features/departments/head/utils/routeUtils'
import { normalizeDepartmentSlug } from '../../api/dynamic-permission.api'
import './CreateRouteModal.css'

interface CreateRouteModalProps {
  open: boolean
  onClose: () => void
  initialDepartmentType?: string
}

const PRESET_SCREENS = [
  { label: '📊 Dashboard', slug: 'dashboard' },
  { label: '👥 Users', slug: 'users' },
  { label: '📋 Customers', slug: 'customers' },
  { label: '📅 15 Days Meeting', slug: 'meeting' },
  { label: '📄 SOP', slug: 'sop' },
  { label: '⏱ History', slug: 'history' },
  { label: '❓ Help Center', slug: 'help-center' },
  { label: '🔄 Service Flow', slug: 'service-flow' },
]

function formatDeptName(deptType: string): string {
  if (!deptType) return 'General'
  const clean = deptType.replace(/_DEPARTMENT$/i, '')
  if (clean.toUpperCase() === 'SMO') return 'SMO'
  if (clean.toUpperCase() === 'SEO') return 'SEO'
  return clean
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function CreateRouteModal({
  open,
  onClose,
  initialDepartmentType,
}: CreateRouteModalProps) {
  const { data: departmentTypes = [], isLoading: isLoadingDepts } =
    useDepartmentTypes(open)
  const createRouteMutation = useCreateDynamicRoute()

  const [selectedDept, setSelectedDept] = useState<string>(
    initialDepartmentType || 'ONBOARDING_DEPARTMENT',
  )
  const [routeName, setRouteName] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const deptSlug = useMemo(
    () => normalizeDepartmentSlug(selectedDept) || 'onboarding_department',
    [selectedDept],
  )

  const normalizedInfo = useMemo(() => {
    return normalizeInputRoute(routeName, selectedDept)
  }, [routeName, selectedDept])

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted) {
      const parsed = normalizeInputRoute(pasted, selectedDept)
      if (parsed.normalized && parsed.wasAutoConverted) {
        e.preventDefault()
        setRouteName(parsed.normalized)
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDept || !routeName.trim()) return

    const finalRouteName = normalizedInfo.normalized || routeName.trim()

    setSuccessMessage(null)
    createRouteMutation.mutate(
      {
        departmentType: selectedDept,
        routeName: finalRouteName,
      },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            `Route "${res.routeName}" created successfully and linked to ${formatDeptName(selectedDept)}!`,
          )
          setRouteName('')
          setTimeout(() => {
            setSuccessMessage(null)
            onClose()
          }, 1500)
        },
      },
    )
  }

  const handleModalClose = () => {
    setSuccessMessage(null)
    setRouteName('')
    createRouteMutation.reset()
    onClose()
  }

  // Format department options for ScrollableSelect
  const deptOptions = useMemo(() => {
    return departmentTypes.map((dt) => {
      const val = typeof dt === 'string' ? dt : String(dt)
      return {
        label: `${formatDeptName(val)} (${val})`,
        value: val,
      }
    })
  }, [departmentTypes])

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Create Dynamic Route"
      description="Register a new accessible route and assign permissions for this department."
      size="md"
    >
      <form className="crm-route-modal-form" onSubmit={handleSubmit}>
        {/* Success Alert */}
        {successMessage && (
          <div className="crm-route-alert is-success">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {createRouteMutation.isError && (
          <div className="crm-route-alert is-error">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{createRouteMutation.error?.message || 'Failed to create route'}</span>
          </div>
        )}

        {/* 1. Department Type Field */}
        <div className="crm-route-field">
          <div className="crm-route-field-header">
            <label className="crm-route-label">
              Department
              <span className="crm-route-badge-subtle">Required</span>
            </label>
          </div>
          <ScrollableSelect
            value={selectedDept}
            onChange={(val) => setSelectedDept(val)}
            options={deptOptions.length > 0 ? deptOptions : departmentTypes}
            disabled={isLoadingDepts || createRouteMutation.isPending}
            searchable={true}
            maxHeight={200}
            width="100%"
          />
          <span className="crm-route-helper">
            Select the department this route will be registered under.
          </span>
        </div>

        {/* 2. Quick Screen Presets */}
        <div className="crm-route-field">
          <label className="crm-route-label">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Quick Screen Presets (1-Click Fill)
          </label>
          <div className="crm-preset-chips-wrap">
            {PRESET_SCREENS.map((p) => {
              const targetPath = `/${deptSlug}/head/${p.slug}`
              const isSelected = routeName === targetPath
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setRouteName(targetPath)}
                  disabled={createRouteMutation.isPending}
                  className={`crm-preset-chip-btn ${isSelected ? 'is-active' : ''}`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Route Path / Name Field */}
        <div className="crm-route-field">
          <div className="crm-route-field-header">
            <label className="crm-route-label">
              Route Path / URL
              <span className="crm-route-badge-subtle">Clean Path</span>
            </label>
          </div>
          <div className="crm-route-input-wrap">
            <Compass className="w-4 h-4 crm-route-input-icon" />
            <input
              type="text"
              placeholder="e.g. /head/meeting or paste any browser URL"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              onPaste={handlePaste}
              disabled={createRouteMutation.isPending}
              required
              className="crm-route-text-input"
            />
          </div>

          {/* Auto-converted Preview Badge */}
          {normalizedInfo.wasAutoConverted && routeName.trim() && (
            <div className="crm-route-converted-box">
              <div className="flex items-center gap-1.5 truncate">
                <span>⚡ Auto-converted to:</span>
                <span className="crm-route-converted-code">
                  {normalizedInfo.normalized}
                </span>
              </div>
              <button
                type="button"
                className="crm-route-apply-btn"
                onClick={() => setRouteName(normalizedInfo.normalized)}
              >
                Apply
              </button>
            </div>
          )}

          <span className="crm-route-helper">
            Tip: You can paste any browser URL directly; it will automatically convert to the clean standard format.
          </span>
        </div>

        {/* 4. Modal Actions */}
        <div className="crm-route-modal-actions">
          <button
            type="button"
            className="crm-route-btn-cancel"
            onClick={handleModalClose}
            disabled={createRouteMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="crm-route-btn-submit"
            disabled={createRouteMutation.isPending || !routeName.trim()}
          >
            {createRouteMutation.isPending ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Submit Route</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
