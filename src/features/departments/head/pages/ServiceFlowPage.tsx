import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '../../../../app/auth/session'
import {
  getServiceFlows,
  getDepartmentConfig,
  type ServiceFlowItem,
} from '../../../../api/service-flow.api'
import { SearchBar } from '../../../../components/head/shared/SearchBar'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { Pill } from '../../../../components/ui/Pill'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import './MeetingPage.css'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function ServiceFlowPage(_props?: { feature?: FeaturePermission }) {
  const session = getSession()
  const currentDepartment =
    session?.user.departmentType || 'GOOGLE_DEPARTMENT'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  // 1. Service Flows API: /api/service/flows?page=0&size=10
  const flowsQuery = useQuery({
    queryKey: ['service-flows', { page, size: pageSize, search }],
    queryFn: () => getServiceFlows({ page, size: pageSize, serviceName: search || undefined }),
    staleTime: 30_000,
  })

  // 2. Department Config API: /api/dept-config/GOOGLE_DEPARTMENT
  const configQuery = useQuery({
    queryKey: ['dept-config', currentDepartment],
    queryFn: () => getDepartmentConfig(currentDepartment),
    staleTime: 60_000,
  })

  const flows = flowsQuery.data?.data ?? []
  const totalElements = flowsQuery.data?.totalElements ?? flows.length

  function handleRefresh() {
    void flowsQuery.refetch()
    void configQuery.refetch()
  }

  return (
    <motion.div
      className="meeting-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ── Toolbar: Search & Refresh ── */}
      <motion.div className="meeting-toolbar" variants={sectionVariants}>
        <div className="meeting-search-wrap">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(0)
            }}
            placeholder="Search service flow by name..."
          />
        </div>

        <div className="meeting-actions">
          <button
            type="button"
            className="meeting-action-btn"
            onClick={handleRefresh}
            title="Refresh service flows"
          >
            ↻ Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {flowsQuery.isPending && !flowsQuery.data ? (
        <LoadingState message="Loading service flows..." />
      ) : flowsQuery.isError ? (
        <ErrorState
          title="Unable to load service flows"
          message={flowsQuery.error.message}
          onRetry={handleRefresh}
        />
      ) : (
        <motion.div variants={sectionVariants}>
          <SectionCard
            title="Service Flows & Steps"
            meta={
              <Pill tone="info" size="sm">
                {totalElements} services configured
              </Pill>
            }
            hint={`Department: ${currentDepartment}`}
          >
            {flows.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                No service flows found for this department.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {flows.map((flow: ServiceFlowItem) => {
                  const steps = Object.entries(flow.serviceFlow ?? {}).sort(
                    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
                  )

                  return (
                    <div
                      key={flow.departmentServiceId}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <h4 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                            {flow.departmentServiceName}
                          </h4>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            Service ID: {flow.departmentServiceId} • {flow.departmentType}
                          </span>
                        </div>
                        <Pill tone="neutral" size="sm">
                          {steps.length} Steps
                        </Pill>
                      </div>

                      {/* Step sequence */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {steps.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                            No step sequence configured
                          </span>
                        ) : (
                          steps.map(([stepName, stepData], stepIdx) => (
                            <div key={stepName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 12px',
                                  borderRadius: 20,
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {stepData.order ?? stepIdx + 1}
                                </span>
                                <span>{stepName}</span>
                              </div>
                              {stepIdx < steps.length - 1 && (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalElements > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 12px 4px' }}>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: page === 0 ? '#f1f5f9' : '#fff',
                    color: page === 0 ? '#94a3b8' : '#334155',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '6px 10px', fontSize: 13, color: '#64748b' }}>
                  Page {page + 1}
                </span>
                <button
                  type="button"
                  disabled={(page + 1) * pageSize >= totalElements}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: (page + 1) * pageSize >= totalElements ? '#f1f5f9' : '#fff',
                    color: (page + 1) * pageSize >= totalElements ? '#94a3b8' : '#334155',
                    cursor: (page + 1) * pageSize >= totalElements ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </SectionCard>
        </motion.div>
      )}
    </motion.div>
  )
}

