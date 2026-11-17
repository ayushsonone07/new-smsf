import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, CircleDot, Flag, Plus, Search, ShieldCheck, XCircle } from 'lucide-react'

import {
  createTicketStatus,
  fetchTicketPriorities,
  fetchTicketStatuses,
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
}

const EMPTY_STATUS_FORM: StatusFormState = {
  name: '',
  isActive: true,
  isDefault: false,
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

function StateBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
      active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}>
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function TypeBadges({ item }: { item: HelpCenterConfigItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {item.isDefault && (
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
          Default
        </span>
      )}
      {item.isSystem && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
          <ShieldCheck size={11} /> System
        </span>
      )}
      {!item.isDefault && !item.isSystem && <span className="text-xs text-slate-400">—</span>}
    </div>
  )
}

export function HelpSupportConfigPage({ type }: HelpSupportConfigPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [addStatusOpen, setAddStatusOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<StatusFormState>(EMPTY_STATUS_FORM)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const isStatus = type === 'status'
  const label = isStatus ? 'Status' : 'Priority'
  const pluralLabel = isStatus ? 'statuses' : 'priorities'
  const query = useQuery({
    queryKey: ['help-center-config', type],
    queryFn: isStatus ? fetchTicketStatuses : fetchTicketPriorities,
    staleTime: 60_000,
  })

  const createStatusMutation = useMutation({
    mutationFn: createTicketStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['help-center-config', 'status'] })
      setAddStatusOpen(false)
      setStatusForm(EMPTY_STATUS_FORM)
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
    createStatusMutation.mutate({
      name: statusForm.name.trim(),
      isActive: statusForm.isActive,
      isDefault: statusForm.isDefault,
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
            {isStatus && (
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
                      ? 'All statuses'
                      : query.data?.find((item) => String(item.id) === statusFilter)?.name || 'All statuses'}
                  </span>
                  <ChevronDown className={`shrink-0 text-slate-400 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} size={14} />
                </button>
                {statusFilterOpen && (
                  <div role="listbox" className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
                    {[{ id: 'all', name: 'All statuses', color: null }, ...(query.data ?? [])].map((item) => {
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
            )}
            <label className="relative block w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {isStatus && (
              <button
                type="button"
                onClick={openAddStatus}
                className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <Plus size={15} /> Add Status
              </button>
            )}
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
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 font-bold">Order</th>
                  <th className="px-3 py-3 font-bold">{label}</th>
                  <th className="px-3 py-3 font-bold">Code</th>
                  <th className="px-3 py-3 font-bold">Category</th>
                  <th className="px-3 py-3 font-bold">State</th>
                  <th className="px-3 py-3 font-bold">Properties</th>
                  <th className="px-3 py-3 font-bold">Updated</th>
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
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><code className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{item.code}</code></td>
                    <td className="px-3 py-3.5 text-slate-600">{item.category || '—'}</td>
                    <td className="px-3 py-3.5"><StateBadge active={item.isActive} /></td>
                    <td className="px-3 py-3.5"><TypeBadges item={item} /></td>
                    <td className="px-3 py-3.5 text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={isStatus && addStatusOpen}
        onClose={() => !createStatusMutation.isPending && setAddStatusOpen(false)}
        title="Add Status"
        description="Create a new ticket status for Help Center workflows."
        size="md"
        closeOnEscape={!createStatusMutation.isPending}
      >
        <form onSubmit={submitStatus} className="space-y-4">
          <div>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Status name</span>
              <input
                required
                autoFocus
                maxLength={80}
                value={statusForm.name}
                onChange={(event) => setStatusForm((form) => ({ ...form, name: event.target.value }))}
                placeholder="Under Technical Review"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={statusForm.isActive} onChange={(event) => setStatusForm((form) => ({ ...form, isActive: event.target.checked }))} className="peer sr-only" />
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white after:content-['']" />
              Active
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={statusForm.isDefault} onChange={(event) => setStatusForm((form) => ({ ...form, isDefault: event.target.checked }))} className="peer sr-only" />
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white after:content-['']" />
              Default status
            </label>
          </div>

          {createStatusMutation.isError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {createStatusMutation.error instanceof Error ? createStatusMutation.error.message : 'Could not create status.'}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={createStatusMutation.isPending} onClick={() => setAddStatusOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={createStatusMutation.isPending} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
              {createStatusMutation.isPending ? 'Creating...' : 'Create Status'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  )
}
