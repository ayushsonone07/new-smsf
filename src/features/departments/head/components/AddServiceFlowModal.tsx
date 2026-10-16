import { useEffect, useState } from 'react'
import { getSession } from '../../../../app/auth/session'
import { addDepartmentService, fetchDepartmentServices } from '../../../../api/manage-services.api'
import { updateServiceFlow, updateServiceTimeline } from '../../../../api/service-flow.api'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultDepartmentType: string
  departmentTypes?: string[]
  isSuperAdmin?: boolean
  onSuccess?: () => void
}

export function AddServiceFlowModal({
  isOpen,
  onClose,
  defaultDepartmentType,
  departmentTypes = [],
  isSuperAdmin = false,
  onSuccess,
}: Props) {
  const [serviceName, setServiceName] = useState('')
  const [deptType, setDeptType] = useState(defaultDepartmentType)
  const [remarks, setRemarks] = useState('')
  const [timelineDays, setTimelineDays] = useState(3)
  const [steps, setSteps] = useState<string[]>([])
  const [newStep, setNewStep] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setServiceName('')
      setDeptType(defaultDepartmentType !== 'ALL' ? defaultDepartmentType : 'GOOGLE_DEPARTMENT')
      setRemarks('')
      setTimelineDays(3)
      setSteps([])
      setNewStep('')
      setError(null)
      setIsSaving(false)
    }
  }, [isOpen, defaultDepartmentType])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleAddStep() {
    const trimmed = newStep.trim()
    if (!trimmed) {
      setError('Please enter a step name.')
      return
    }
    if (steps.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setError('A step with this name already exists.')
      return
    }
    setSteps((prev) => [...prev, trimmed])
    setNewStep('')
    setError(null)
  }

  function handleRemoveStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleMove(idx: number, dir: 'up' | 'down') {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= steps.length) return
    setSteps((prev) => {
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[target]
      next[target] = tmp
      return next
    })
  }

  async function resolveServiceId(username: string, name: string): Promise<string | number | null> {
    try {
      const res = await fetchDepartmentServices({ username, searchParam: name, page: 0, size: 10 })
      const match =
        (res?.data ?? []).find((s) => s.departmentServiceName.toLowerCase() === name.toLowerCase()) ??
        (res?.data ?? [])[0]
      return match?.departmentServiceId ?? null
    } catch {
      return null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const session = getSession()
    const username = session?.user?.email || session?.user?.username || ''
    const name = serviceName.trim()
    if (!name) {
      setError('Service name is required.')
      return
    }
    const effectiveDept = isSuperAdmin ? deptType : defaultDepartmentType !== 'ALL' ? defaultDepartmentType : deptType
    if (!effectiveDept || effectiveDept === 'ALL') {
      setError('Please select a department.')
      return
    }
    if (!username) {
      setError('No logged-in user found.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      // 1. Create service shell (POST /api/service/manage?action=add)
      const addRes: any = await addDepartmentService(username, effectiveDept, {
        departmentServiceName: name,
        remarks: remarks.trim() || null,
        isServiceActive: true,
      })
      let serviceId: string | number | null =
        addRes?.data?.departmentServiceId ??
        addRes?.departmentServiceId ??
        addRes?.data?.data?.departmentServiceId ??
        null

      // Fallback: lookup by name if backend does not return the id
      if (!serviceId) {
        serviceId = await resolveServiceId(username, name)
      }
      if (!serviceId) {
        throw new Error('Service created but its ID was not returned. Refresh the list and use Edit sequence to add steps.')
      }

      // 2. Create flow steps (PUT /api/service/{id}/flow) — SMSB treats first PUT as create
      if (steps.length > 0) {
        const flowMap: Record<string, { order: number }> = {}
        steps.forEach((stepName, idx) => {
          flowMap[stepName] = { order: idx + 1 }
        })
        await updateServiceFlow(serviceId, { flow: flowMap })
      }

      // 3. Optional timeline
      if (timelineDays && timelineDays >= 1) {
        try {
          await updateServiceTimeline(String(serviceId), timelineDays)
        } catch {
          // Timeline is optional — flow is already created
        }
      }

      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create service flow. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(2px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: '#fff',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              + Add Service Flow
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Creates the service and its workflow steps (POST manage → PUT flow).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                Service Name *
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Google Business Setup"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                  Department *
                </label>
                {isSuperAdmin ? (
                  <select
                    value={deptType}
                    onChange={(e) => setDeptType(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    {(departmentTypes.length > 0 ? departmentTypes : [defaultDepartmentType])
                      .filter((d) => d !== 'ALL')
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={defaultDepartmentType}
                    disabled
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#475569' }}
                  />
                )}
              </div>
              <div style={{ width: 140 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                  Timeline (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={timelineDays}
                  onChange={(e) => setTimelineDays(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional note"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                Workflow Steps (in order)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddStep()
                    }
                  }}
                  placeholder="Enter step name"
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={handleAddStep}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              {steps.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 }}>
                  No steps yet. Service will be created; you can add steps later via Edit sequence.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {steps.map((s, idx) => (
                    <div
                      key={`${s}-${idx}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {idx + 1}
                      </span>
                      <span style={{ flex: 1, fontWeight: 500, color: '#334155' }}>{s}</span>
                      <button type="button" onClick={() => handleMove(idx, 'up')} disabled={idx === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }} title="Move up">↑</button>
                      <button type="button" onClick={() => handleMove(idx, 'down')} disabled={idx === steps.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }} title="Move down">↓</button>
                      <button type="button" onClick={() => handleRemoveStep(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}
            >
              {isSaving ? 'Creating...' : '+ Create Service Flow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
