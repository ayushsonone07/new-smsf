import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronDown, CircleDot, Flag, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react'

import {
  createTicketStatus,
  deleteTicketPriority,
  deleteTicketStatusConfig,
  createTicketPriority,
  fetchTicketPriorities,
  fetchTicketStatuses,
  setTicketConfigActive,
  updateTicketPriority,
  updateTicketStatusConfig,
  type HelpCenterConfigItem,
} from '../../../api/help-center-config.api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import { LoadingState } from '../../../components/ui/LoadingState'
import { Modal } from '../../../components/ui/Modal'
import { RefreshButton } from '../../../components/ui/RefreshButton'

interface HelpSupportConfigPageProps {
  type: 'status' | 'priority'
}

interface StatusFormState {
  name: string
  isActive: boolean
  isDefault: boolean
  followupHours: string
  resolveHours: string
}

const EMPTY_STATUS_FORM: StatusFormState = {
  name: '',
  isActive: true,
  isDefault: false,
  followupHours: '',
  resolveHours: '',
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function ActiveToggleSwitch({
  active,
  disabled,
  isPending,
  onChange,
}: {
  active: boolean
  disabled?: boolean
  isPending?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled || isPending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onChange(!active)
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'bg-emerald-600' : 'bg-slate-300'
      }`}
    >
      <span className="sr-only">{active ? 'Active' : 'Inactive'}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {isPending && <Loader2 className="h-2.5 w-2.5 animate-spin text-slate-500" />}
      </span>
    </button>
  )
}

export function HelpSupportConfigPage({ type }: HelpSupportConfigPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [addStatusOpen, setAddStatusOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<StatusFormState>(EMPTY_STATUS_FORM)
  const [editingPriority, setEditingPriority] = useState<HelpCenterConfigItem | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<HelpCenterConfigItem | null>(null)
  const [editingStatus, setEditingStatus] = useState<HelpCenterConfigItem | null>(null)
  const [statusEditForm, setStatusEditForm] = useState({ name: '', sortOrder: '', isDefault: false })
  const [deleteStatusCandidate, setDeleteStatusCandidate] = useState<HelpCenterConfigItem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', followupHours: '', resolveHours: '', isDefault: false })
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const isStatus = type === 'status'
  const label = isStatus ? 'Status' : 'Priority'
  const pluralLabel = isStatus ? 'statuses' : 'priorities'
  const query = useQuery({
    queryKey: ['help-center-config', type],
    queryFn: isStatus ? fetchTicketStatuses : fetchTicketPriorities,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setTicketConfigActive(type, id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['help-center-config', type] })
      const previous = queryClient.getQueryData<HelpCenterConfigItem[]>(['help-center-config', type])
      queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', type], (old) =>
        old?.map((item) => (item.id === id ? { ...item, isActive: active } : item)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['help-center-config', type], context.previous)
      }
    },
    onSuccess: (updatedItem, variables) => {
      queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', type], (old) =>
        old?.map((item) => {
          if (item.id !== variables.id) return item
          const patch = updatedItem && typeof updatedItem === 'object' ? updatedItem : {}
          return { ...item, ...patch, isActive: variables.active }
        })
      )
    },
  })

  const createStatusMutation = useMutation({
    mutationFn: async (form: StatusFormState) => isStatus
      ? createTicketStatus({ name: form.name, isActive: form.isActive, isDefault: form.isDefault })
      : createTicketPriority({
          name: form.name,
          followupHours: Number(form.followupHours),
          resolveHours: Number(form.resolveHours),
          color: '#2563EB',
          sortOrder: Math.max(0, ...(query.data ?? []).map((item) => item.sortOrder)) + 1,
          isActive: form.isActive,
          isDefault: form.isDefault,
        }),
    onSuccess: async (createdItem) => {
      if (createdItem) {
        queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', type], (old) => {
          if (!old) return [createdItem]
          if (old.some((item) => item.id === createdItem.id)) return old
          return [...old, createdItem]
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['help-center-config', type] })
      setAddStatusOpen(false)
      setStatusForm(EMPTY_STATUS_FORM)
    },
  })

  const updatePriorityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateTicketPriority>[1] }) => updateTicketPriority(id, payload),
    onSuccess: async (updatedItem) => {
      if (updatedItem) {
        queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', 'priority'], (old) =>
          old?.map((item) => {
            if (item.id === updatedItem.id) {
              return { ...item, ...updatedItem }
            }
            if (updatedItem.isDefault) {
              return { ...item, isDefault: false }
            }
            return item
          }) ?? [updatedItem]
        )
      }
      await queryClient.invalidateQueries({ queryKey: ['help-center-config', 'priority'] })
      setEditingPriority(null)
    },
  })

  const deletePriorityMutation = useMutation({
    mutationFn: deleteTicketPriority,
    onSuccess: async (_data, deletedId) => {
      queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', 'priority'], (old) =>
        old?.filter((item) => item.id !== deletedId) ?? []
      )
      await queryClient.invalidateQueries({ queryKey: ['help-center-config', 'priority'] })
      setDeleteCandidate(null)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateTicketStatusConfig>[1] }) => updateTicketStatusConfig(id, payload),
    onSuccess: async (updatedItem) => {
      if (updatedItem) {
        queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', 'status'], (old) =>
          old?.map((item) => {
            if (item.id === updatedItem.id) {
              return { ...item, ...updatedItem }
            }
            if (updatedItem.isDefault) {
              return { ...item, isDefault: false }
            }
            return item
          }) ?? [updatedItem]
        )
      }
      await queryClient.invalidateQueries({ queryKey: ['help-center-config', 'status'] })
      setEditingStatus(null)
    },
  })

  const deleteStatusMutation = useMutation({
    mutationFn: deleteTicketStatusConfig,
    onSuccess: async (_data, deletedId) => {
      queryClient.setQueryData<HelpCenterConfigItem[]>(['help-center-config', 'status'], (old) =>
        old?.filter((item) => item.id !== deletedId) ?? []
      )
      await queryClient.invalidateQueries({ queryKey: ['help-center-config', 'status'] })
      setDeleteStatusCandidate(null)
    },
  })

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node
      if (!statusFilterRef.current?.contains(target)) setStatusFilterOpen(false)
    }
    document.addEventListener('mousedown', closeMenus)
    return () => document.removeEventListener('mousedown', closeMenus)
  }, [])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const sorted = [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
    return sorted.filter((item) => {
      const matchesStatus = statusFilter === 'all' || String(item.id) === statusFilter
      const matchesSearch = !term || [item.name, item.code, item.category].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      )
      return matchesStatus && matchesSearch
    })
  }, [query.data, search, statusFilter])

  const activeCount = (query.data ?? []).filter((item) => item.isActive).length

  function openAddStatus() {
    setStatusForm(EMPTY_STATUS_FORM)
    createStatusMutation.reset()
    setAddStatusOpen(true)
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!statusForm.name.trim()) return
    if (!isStatus && (
      !statusForm.followupHours || Number(statusForm.followupHours) < 1 ||
      !statusForm.resolveHours || Number(statusForm.resolveHours) < 1
    )) return
    createStatusMutation.mutate({ ...statusForm, name: statusForm.name.trim() })
  }

  function openEditPriority(item: HelpCenterConfigItem) {
    updatePriorityMutation.reset()
    setEditingPriority(item)
    setEditForm({
      name: item.name,
      followupHours: String(item.followupHours ?? ''),
      resolveHours: String(item.resolveHours ?? ''),
      isDefault: Boolean(item.isDefault),
    })
  }

  function submitPriorityUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingPriority || !editForm.name.trim() || Number(editForm.followupHours) < 1 || Number(editForm.resolveHours) < 1) return
    updatePriorityMutation.mutate({
      id: editingPriority.id,
      payload: {
        name: editForm.name.trim(),
        followupHours: Number(editForm.followupHours),
        resolveHours: Number(editForm.resolveHours),
        color: editingPriority.color || '#2563EB',
        sortOrder: editingPriority.sortOrder,
        isActive: editingPriority.isActive,
        isDefault: editForm.isDefault,
      },
    })
  }

  function openEditStatus(item: HelpCenterConfigItem) {
    updateStatusMutation.reset()
    setEditingStatus(item)
    setStatusEditForm({
      name: item.name,
      sortOrder: String(item.sortOrder),
      isDefault: Boolean(item.isDefault),
    })
  }

  function submitStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingStatus || !statusEditForm.name.trim() || Number(statusEditForm.sortOrder) < 1) return
    updateStatusMutation.mutate({
      id: editingStatus.id,
      payload: {
        name: statusEditForm.name.trim(),
        sortOrder: Number(statusEditForm.sortOrder),
        isActive: editingStatus.isActive,
        isDefault: statusEditForm.isDefault,
      },
    })
  }

  return (
    <PageLayout>
      <PageHeader
        title={`Help & Support ${label}`}
        description={`View and manage the ticket ${label.toLowerCase()} configuration available in Help Center.`}
        actions={
          <RefreshButton
            onRefresh={() => query.refetch()}
            isRefreshing={query.isFetching}
            label={`${label.toLowerCase()} list`}
          />
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3 p-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {isStatus ? <CircleDot size={19} /> : <Flag size={19} />}
            </div>
            <div><p className="text-xs font-semibold text-slate-500">Total</p><p className="text-xl font-extrabold text-slate-900">{query.data?.length ?? 0}</p></div>
          </div>
        </Card>
        <Card>
          <div className="p-1"><p className="text-xs font-semibold text-slate-500">Active</p><p className="text-xl font-extrabold text-emerald-600">{activeCount}</p></div>
        </Card>
        <Card>
          <div className="p-1"><p className="text-xs font-semibold text-slate-500">Inactive</p><p className="text-xl font-extrabold text-slate-500">{Math.max(0, (query.data?.length ?? 0) - activeCount)}</p></div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Ticket {label} List</h2>
            <p className="mt-1 text-xs text-slate-500">Sorted by the configured display order.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div ref={statusFilterRef} className="relative sm:w-44">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={statusFilterOpen}
                  onClick={() => setStatusFilterOpen((open) => !open)}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <span className="truncate">
                    {statusFilter === 'all'
                      ? `All ${pluralLabel}`
                      : query.data?.find((item) => String(item.id) === statusFilter)?.name || `All ${pluralLabel}`}
                  </span>
                  <ChevronDown className={`shrink-0 text-slate-400 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} size={14} />
                </button>
                {statusFilterOpen && (
                  <div role="listbox" className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
                    {[{ id: 'all', name: `All ${pluralLabel}`, color: null }, ...(query.data ?? [])].map((item) => {
                      const value = String(item.id)
                      const selected = statusFilter === value
                      return (
                        <button
                          key={value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setStatusFilter(value)
                            setStatusFilterOpen(false)
                          }}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${selected ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                          {item.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/5" style={{ backgroundColor: item.color }} />}
                          <span className="truncate">{item.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            <label className="relative block w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
              <button
                type="button"
                onClick={openAddStatus}
                className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <Plus size={15} /> New {label}
              </button>
          </div>
        </div>

        {query.isLoading ? (
          <div className="py-14"><LoadingState message={`Loading ticket ${pluralLabel}...`} /></div>
        ) : query.isError ? (
          <div className="py-14 text-center">
            <p className="text-sm font-bold text-red-700">Could not load ticket {pluralLabel}.</p>
            <button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">Try again</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-sm font-semibold text-slate-500">No matching {label.toLowerCase()} records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 font-bold w-16">Order</th>
                  <th className="px-3 py-3 font-bold">{label}</th>
                  {!isStatus && (
                    <>
                      <th className="px-3 py-3 font-bold">Follow-up (hours)</th>
                      <th className="px-3 py-3 font-bold">Resolve time (hours)</th>
                    </>
                  )}
                  <th className="px-3 py-3 font-bold">State</th>
                  <th className="px-3 py-3 font-bold">Updated</th>
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 text-xs transition hover:bg-slate-50/70">
                    <td className="px-3 py-3.5 font-bold text-slate-500">{item.sortOrder}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full border border-black/5" style={{ backgroundColor: item.color || '#94A3B8' }} />
                        <span className="font-bold text-slate-900">{item.name}</span>
                        {item.isDefault && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    {!isStatus && (
                      <>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {item.followupHours != null ? `${item.followupHours} hrs` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            {item.resolveHours != null ? `${item.resolveHours} hrs` : '—'}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <ActiveToggleSwitch
                          active={Boolean(item.isActive)}
                          disabled={toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === item.id}
                          isPending={toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === item.id}
                          onChange={(nextActive) => {
                            if (!nextActive && item.isDefault) {
                              alert(`Cannot deactivate default ${label.toLowerCase()} (“${item.name}”). Please designate another ${label.toLowerCase()} as default first by clicking 'Update' and marking it as Default.`)
                              return
                            }
                            toggleActiveMutation.mutate({ id: item.id, active: nextActive })
                          }}
                        />
                        <span className={`text-[11px] font-bold ${item.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</td>
                    {!isStatus && (
                      <td className="px-3 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => openEditPriority(item)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[11px] font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100">
                            <Pencil size={13} /> Update
                          </button>
                          <button type="button" onClick={() => { deletePriorityMutation.reset(); setDeleteCandidate(item) }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-100">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    )}
                    {isStatus && (
                      <td className="px-3 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => openEditStatus(item)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100"><Pencil size={13} /> Update</button>
                          <button type="button" onClick={() => { deleteStatusMutation.reset(); setDeleteStatusCandidate(item) }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-100"><Trash2 size={13} /> Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={addStatusOpen}
        onClose={() => !createStatusMutation.isPending && setAddStatusOpen(false)}
        title={`New ${label}`}
        description={`Create a new ticket ${label.toLowerCase()} for Help Center workflows.`}
        size="md"
        closeOnEscape={!createStatusMutation.isPending}
      >
        <form onSubmit={submitStatus} className="space-y-4">
          <div>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">{label} name</span>
              <input
                required
                autoFocus
                maxLength={80}
                value={statusForm.name}
                onChange={(event) => setStatusForm((form) => ({ ...form, name: event.target.value }))}
                placeholder={isStatus ? 'Under Technical Review' : 'Urgent'}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {!isStatus && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Follow-up time (hours)</span>
                <input required type="number" min="1" step="1" value={statusForm.followupHours} onChange={(event) => setStatusForm((form) => ({ ...form, followupHours: event.target.value }))} placeholder="2" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Resolve time (hours)</span>
                <input required type="number" min="1" step="1" value={statusForm.resolveHours} onChange={(event) => setStatusForm((form) => ({ ...form, resolveHours: event.target.value }))} placeholder="6" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={statusForm.isActive} onChange={(event) => setStatusForm((form) => ({ ...form, isActive: event.target.checked }))} className="peer sr-only" />
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white after:content-['']" />
              Active
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={statusForm.isDefault} onChange={(event) => setStatusForm((form) => ({ ...form, isDefault: event.target.checked }))} className="peer sr-only" />
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white after:content-['']" />
              Default {label.toLowerCase()}
            </label>
          </div>

          {createStatusMutation.isError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {createStatusMutation.error instanceof Error ? createStatusMutation.error.message : `Could not create ${label.toLowerCase()}.`}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={createStatusMutation.isPending} onClick={() => setAddStatusOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={createStatusMutation.isPending} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
              {createStatusMutation.isPending ? 'Creating...' : `Create ${label}`}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editingPriority}
        onClose={() => !updatePriorityMutation.isPending && setEditingPriority(null)}
        title="Update Priority"
        description="Update the priority name and response timing. Existing configuration is preserved."
        size="md"
        closeOnEscape={!updatePriorityMutation.isPending}
      >
        <form onSubmit={submitPriorityUpdate} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">Priority name</span>
            <input required autoFocus maxLength={80} value={editForm.name} onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Follow-up time (hours)</span>
              <input required type="number" min="1" step="1" value={editForm.followupHours} onChange={(event) => setEditForm((form) => ({ ...form, followupHours: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Resolve time (hours)</span>
              <input required type="number" min="1" step="1" value={editForm.resolveHours} onChange={(event) => setEditForm((form) => ({ ...form, resolveHours: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={editForm.isDefault}
                onChange={(event) => setEditForm((form) => ({ ...form, isDefault: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Default priority (tickets will default to this priority)
            </label>
          </div>
          {updatePriorityMutation.isError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{updatePriorityMutation.error instanceof Error ? updatePriorityMutation.error.message : 'Could not update priority.'}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={updatePriorityMutation.isPending} onClick={() => setEditingPriority(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={updatePriorityMutation.isPending} className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{updatePriorityMutation.isPending ? 'Updating...' : 'Update Priority'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteCandidate}
        onClose={() => !deletePriorityMutation.isPending && setDeleteCandidate(null)}
        title="Delete Priority"
        description="This action permanently removes the priority and cannot be undone."
        size="md"
        closeOnEscape={!deletePriorityMutation.isPending}
      >
        {deleteCandidate && (() => {
          const canDelete = !deleteCandidate.isActive && !deleteCandidate.isDefault
          return (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 rounded-2xl border p-4 ${canDelete ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${canDelete ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <p className="text-sm font-bold text-slate-900">{canDelete ? `Delete “${deleteCandidate.name}”?` : `“${deleteCandidate.name}” cannot be deleted yet.`}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">A priority can only be deleted when all safety conditions below are satisfied.</p>
                </div>
              </div>
              <ul className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-700">
                <li className={deleteCandidate.isActive ? 'text-red-700' : 'text-emerald-700'}>• Priority toggle must be OFF {deleteCandidate.isActive ? '— currently Active' : '— satisfied'}</li>
                <li className={deleteCandidate.isDefault ? 'text-red-700' : 'text-emerald-700'}>• Priority must not be the default {deleteCandidate.isDefault ? '— currently Default' : '— satisfied'}</li>
                <li>• No tickets may currently use this priority — verified by the server when deleting</li>
              </ul>
              {deletePriorityMutation.isError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{deletePriorityMutation.error instanceof Error ? deletePriorityMutation.error.message : 'Could not delete priority.'}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" disabled={deletePriorityMutation.isPending} onClick={() => setDeleteCandidate(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={!canDelete || deletePriorityMutation.isPending} onClick={() => deletePriorityMutation.mutate(deleteCandidate.id)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} />{deletePriorityMutation.isPending ? 'Deleting...' : 'Delete Priority'}</button>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal open={!!editingStatus} onClose={() => !updateStatusMutation.isPending && setEditingStatus(null)} title="Update Status" description="Update the status name and display order." size="md" closeOnEscape={!updateStatusMutation.isPending}>
        <form onSubmit={submitStatusUpdate} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Status name</span><input required autoFocus maxLength={80} value={statusEditForm.name} onChange={(event) => setStatusEditForm((form) => ({ ...form, name: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Display order</span><input required type="number" min="1" step="1" value={statusEditForm.sortOrder} onChange={(event) => setStatusEditForm((form) => ({ ...form, sortOrder: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <div className="rounded-xl bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={statusEditForm.isDefault}
                onChange={(event) => setStatusEditForm((form) => ({ ...form, isDefault: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Default status (new tickets will default to this status)
            </label>
          </div>
          {updateStatusMutation.isError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{updateStatusMutation.error instanceof Error ? updateStatusMutation.error.message : 'Could not update status.'}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={updateStatusMutation.isPending} onClick={() => setEditingStatus(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={updateStatusMutation.isPending} className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}</button></div>
        </form>
      </Modal>

      <Modal open={!!deleteStatusCandidate} onClose={() => !deleteStatusMutation.isPending && setDeleteStatusCandidate(null)} title="Delete Status" description="This action permanently removes the status and cannot be undone." size="md" closeOnEscape={!deleteStatusMutation.isPending}>
        {deleteStatusCandidate && (() => {
          const canDelete = !deleteStatusCandidate.isActive && !deleteStatusCandidate.isDefault
          return <div className="space-y-4">
            <div className={`flex items-start gap-3 rounded-2xl border p-4 ${canDelete ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${canDelete ? 'text-red-600' : 'text-amber-600'}`} /><div><p className="text-sm font-bold text-slate-900">{canDelete ? `Delete “${deleteStatusCandidate.name}”?` : `“${deleteStatusCandidate.name}” cannot be deleted yet.`}</p><p className="mt-1 text-xs text-slate-600">All safety conditions must be satisfied before deletion.</p></div></div>
            <ul className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-700"><li className={deleteStatusCandidate.isActive ? 'text-red-700' : 'text-emerald-700'}>• Status toggle must be OFF {deleteStatusCandidate.isActive ? '— currently Active' : '— satisfied'}</li><li className={deleteStatusCandidate.isDefault ? 'text-red-700' : 'text-emerald-700'}>• Status must not be the default {deleteStatusCandidate.isDefault ? '— currently Default' : '— satisfied'}</li><li>• No tickets may currently use this status — verified by the server when deleting</li></ul>
            {deleteStatusMutation.isError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{deleteStatusMutation.error instanceof Error ? deleteStatusMutation.error.message : 'Could not delete status.'}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={deleteStatusMutation.isPending} onClick={() => setDeleteStatusCandidate(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" disabled={!canDelete || deleteStatusMutation.isPending} onClick={() => deleteStatusMutation.mutate(deleteStatusCandidate.id)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} />{deleteStatusMutation.isPending ? 'Deleting...' : 'Delete Status'}</button></div>
          </div>
        })()}
      </Modal>
    </PageLayout>
  )
}
