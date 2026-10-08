import { useState, useMemo } from 'react'
import { CustomersListSearchBar } from '../../../../components/head/customers-list/CustomersListSearchBar'
import {
  CustomersListFilters,
  type CustomerTab,
  type AssigneeOption,
} from '../../../../components/head/customers-list/CustomersListFilters'
import {
  CustomersList,
  type OnboardingCustomer,
  type OnboardingStatus,
} from '../../../../components/head/customers-list/CustomersList'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
import '../../../../components/head/customers-list/CustomersList.css'

// ============================================================================
// TEMPORARY UI TEST DATA
// Matches the reference design screenshots exactly.
// Counts: Total 24 (Pending: 10, In progress: 8, Completed: 6)
// ============================================================================

const MOCK_ASSIGNEES: AssigneeOption[] = [
  { id: 'u-1', name: 'Abhishek Sahu' },
  { id: 'u-2', name: 'Mahima' },
  { id: 'u-3', name: 'Mohit' },
  { id: 'u-4', name: 'Bhupinder' },
  { id: 'u-5', name: 'Gungun' },
  { id: 'u-6', name: 'Afreen' },
  { id: 'u-7', name: 'Ayushi' },
  { id: 'u-8', name: 'Nikita' },
]

const INITIAL_CUSTOMERS: OnboardingCustomer[] = [
  // ── Pending (10 items) ────────────────────────────────────────────────────
  {
    id: 'cust-onb-1',
    rowIndex: 1,
    businessName: 'Lala Company',
    businessRelationType: 'main',
    businessCount: 3,
    duplicateCount: 1,
    contactName: 'Satyam Tiwari',
    contactDate: '18 Sep 2026',
    email: 'satyam@lalaco.in',
    phone: '9403948576',
    callStatus: 'connected',
    status: 'pending',
    assigneeId: 'u-1',
    remark: 'Called twice — demo booked for Monday 11am.',
    updatedLabel: '2h ago',
  },
  {
    id: 'cust-onb-2',
    rowIndex: 2,
    businessName: 'Lala Company (NIT)',
    businessRelationType: 'branch',
    businessCount: 3,
    businessIndex: 3,
    contactName: 'Satyam Tiwari',
    contactDate: '28 Sep 2026',
    email: 'satyam@lalaco.in',
    phone: '9403948576',
    callStatus: 'connected',
    status: 'pending',
    assigneeId: 'u-1',
    remark: '',
    updatedLabel: 'Yesterday',
  },
  {
    id: 'cust-onb-3',
    rowIndex: 3,
    businessName: 'Ananya Florals',
    businessRelationType: 'main',
    businessCount: 2,
    contactName: 'Ananya',
    contactDate: '7 Sep 2026',
    email: 'mbg.ananya@gmail.com',
    phone: '9811002233',
    callStatus: 'not-answered',
    status: 'pending',
    assigneeId: null,
    remark: '',
    updatedLabel: '6 days ago',
  },
  {
    id: 'cust-onb-4',
    rowIndex: 4,
    businessName: 'testBusinsee',
    contactName: 'Nikita',
    contactDate: '6 Aug 2026',
    email: 'nikitatest@mbg.com',
    phone: '9000011122',
    callStatus: 'not-answered',
    status: 'pending',
    assigneeId: 'u-1',
    remark: 'Test record — ignore.',
    updatedLabel: '8 days ago',
  },
  {
    id: 'cust-onb-5',
    rowIndex: 5,
    businessName: 'Sharma Sweets',
    contactName: 'Rakesh Sharma',
    contactDate: '15 Sep 2026',
    email: 'rakeshsharma@gmail.com',
    phone: '9810000000',
    callStatus: 'not-answered',
    status: 'pending',
    assigneeId: 'u-1',
    remark: 'Follow-up call scheduled.',
    updatedLabel: '10 days ago',
  },
  {
    id: 'cust-onb-6',
    rowIndex: 6,
    businessName: 'Neha Gupta Enterprises',
    contactName: 'Neha Gupta',
    contactDate: '12 Sep 2026',
    email: 'nehagupta@gmail.com',
    phone: '9820011223',
    callStatus: 'connected',
    status: 'pending',
    assigneeId: 'u-2',
    remark: 'Need GST invoice copy.',
    updatedLabel: '12 days ago',
  },
  {
    id: 'cust-onb-7',
    rowIndex: 7,
    businessName: 'Apex Logistics',
    businessRelationType: 'main',
    businessCount: 2,
    contactName: 'Vikram Mehta',
    contactDate: '14 Sep 2026',
    email: 'vikram@apexlogistics.in',
    phone: '9845012345',
    callStatus: 'not-answered',
    status: 'pending',
    assigneeId: 'u-3',
    remark: 'Sent onboarding link on WhatsApp.',
    updatedLabel: '14 days ago',
  },
  {
    id: 'cust-onb-8',
    rowIndex: 8,
    businessName: 'Royal Bakery',
    contactName: 'Farhan Ali',
    contactDate: '16 Sep 2026',
    email: 'farhan@royalbakery.com',
    phone: '9765432100',
    callStatus: 'connected',
    status: 'pending',
    assigneeId: 'u-5',
    remark: 'Awaiting catalog pictures.',
    updatedLabel: '15 days ago',
  },
  {
    id: 'cust-onb-9',
    rowIndex: 9,
    businessName: 'Green Leaf Pharmacy',
    contactName: 'Dr. Suresh Nair',
    contactDate: '20 Sep 2026',
    email: 'suresh@greenleaf.in',
    phone: '9988776655',
    callStatus: 'connected',
    status: 'pending',
    assigneeId: 'u-6',
    remark: 'Reviewing digital card draft.',
    updatedLabel: '18 days ago',
  },
  {
    id: 'cust-onb-10',
    rowIndex: 10,
    businessName: 'Zenith Tech Solutions',
    contactName: 'Pooja Deshmukh',
    contactDate: '22 Sep 2026',
    email: 'pooja@zenithtech.io',
    phone: '9123456780',
    callStatus: 'not-answered',
    status: 'pending',
    assigneeId: null,
    remark: '',
    updatedLabel: '20 days ago',
  },

  // ── In progress (8 items) ─────────────────────────────────────────────────
  {
    id: 'cust-onb-11',
    rowIndex: 11,
    businessName: 'Blue Bell School',
    businessRelationType: 'main',
    businessCount: 2,
    contactName: 'Anita Joseph',
    contactDate: '10 Sep 2026',
    email: 'anita@bluebell.edu.in',
    phone: '9876543211',
    callStatus: 'connected',
    status: 'in-progress',
    assigneeId: 'u-3',
    remark: 'Shared theme options on WhatsApp.',
    updatedLabel: '3h ago',
  },
  {
    id: 'cust-onb-12',
    rowIndex: 12,
    businessName: 'Spice Route Kitchen',
    contactName: 'Arjun Menon',
    contactDate: '11 Sep 2026',
    email: 'arjun@spiceroute.in',
    phone: '9812345671',
    callStatus: 'connected',
    status: 'in-progress',
    assigneeId: 'u-1',
    remark: 'Requirement form filled partially.',
    updatedLabel: '5h ago',
  },
  {
    id: 'cust-onb-13',
    rowIndex: 13,
    businessName: 'Glow Salon',
    contactName: 'Ritika Sen',
    contactDate: '13 Sep 2026',
    email: 'ritika@glowsalon.com',
    phone: '9822334455',
    callStatus: 'connected',
    status: 'in-progress',
    assigneeId: 'u-2',
    remark: 'Demo done, awaiting confirmation.',
    updatedLabel: '1 day ago',
  },
  {
    id: 'cust-onb-14',
    rowIndex: 14,
    businessName: 'AutoFix Garage',
    contactName: 'Sandeep Yadav',
    contactDate: '14 Sep 2026',
    email: 'sandeep@autofix.co.in',
    phone: '9833445566',
    callStatus: 'not-answered',
    status: 'in-progress',
    assigneeId: 'u-4',
    remark: 'Asked for GST & address proof.',
    updatedLabel: '2 days ago',
  },
  {
    id: 'cust-onb-15',
    rowIndex: 15,
    businessName: 'Bloom Florist',
    contactName: 'Kavya Iyer',
    contactDate: '15 Sep 2026',
    email: 'kavya@bloomflorist.in',
    phone: '9844556677',
    callStatus: 'connected',
    status: 'in-progress',
    assigneeId: 'u-5',
    remark: 'Follow-up call scheduled for tomorrow.',
    updatedLabel: '3 days ago',
  },
  {
    id: 'cust-onb-16',
    rowIndex: 16,
    businessName: 'TechNest Repairs',
    contactName: 'Rahul Verma',
    contactDate: '17 Sep 2026',
    email: 'rahul@technest.in',
    phone: '9855667788',
    callStatus: 'connected',
    status: 'in-progress',
    assigneeId: 'u-6',
    remark: 'Google verification awaited.',
    updatedLabel: '4 days ago',
  },
  {
    id: 'cust-onb-17',
    rowIndex: 17,
    businessName: 'Om Sai Medicals',
    contactName: 'Suresh Kumar',
    contactDate: '18 Sep 2026',
    email: 'suresh@omsaimedicals.in',
    phone: '9866778899',
    callStatus: 'not-answered',
    status: 'in-progress',
    assigneeId: 'u-1',
    remark: 'WhatsApp API approval pending.',
    updatedLabel: '5 days ago',
  },
  {
    id: 'cust-onb-18',
    rowIndex: 18,
    businessName: 'Urban Fitness Studio',
    contactName: 'Manish Rawat',
    contactDate: '19 Sep 2026',
    email: 'manish@urbanfitness.in',
    phone: '9877889900',
    callStatus: 'connected',
    status: 'in-progress',
    assigneeId: 'u-8',
    remark: 'Trainer schedule being integrated.',
    updatedLabel: '7 days ago',
  },

  // ── Completed (6 items) ───────────────────────────────────────────────────
  {
    id: 'cust-onb-19',
    rowIndex: 19,
    businessName: 'Shree Ganesh Hardware',
    contactName: 'Mahesh Patel',
    contactDate: '01 Sep 2026',
    email: 'mahesh@ganeshhardware.com',
    phone: '9788990011',
    callStatus: 'connected',
    status: 'completed',
    assigneeId: 'u-1',
    remark: 'Handover done, client happy.',
    updatedLabel: '1 day ago',
  },
  {
    id: 'cust-onb-20',
    rowIndex: 20,
    businessName: 'Sunrise Cafe',
    contactName: 'Meenakshi Sundaram',
    contactDate: '03 Sep 2026',
    email: 'meenakshi@sunrisecafe.in',
    phone: '9799001122',
    callStatus: 'connected',
    status: 'completed',
    assigneeId: 'u-2',
    remark: 'Live QR menu deployed.',
    updatedLabel: '3 days ago',
  },
  {
    id: 'cust-onb-21',
    rowIndex: 21,
    businessName: 'Modern Dental Clinic',
    contactName: 'Dr. Alok Pandey',
    contactDate: '05 Sep 2026',
    email: 'alok@moderndental.in',
    phone: '9700112233',
    callStatus: 'connected',
    status: 'completed',
    assigneeId: 'u-3',
    remark: 'Appointment booking verified.',
    updatedLabel: '6 days ago',
  },
  {
    id: 'cust-onb-22',
    rowIndex: 22,
    businessName: 'Elite Chartered Accountants',
    contactName: 'CA Rajesh Aggarwal',
    contactDate: '08 Sep 2026',
    email: 'rajesh@eliteca.com',
    phone: '9711223344',
    callStatus: 'connected',
    status: 'completed',
    assigneeId: 'u-5',
    remark: 'Domain mapped & SSL verified.',
    updatedLabel: '8 days ago',
  },
  {
    id: 'cust-onb-23',
    rowIndex: 23,
    businessName: 'Heritage Jewels',
    contactName: 'Deepak Soni',
    contactDate: '09 Sep 2026',
    email: 'deepak@heritagejewels.in',
    phone: '9722334455',
    callStatus: 'connected',
    status: 'completed',
    assigneeId: 'u-6',
    remark: 'Catalog published with 120 items.',
    updatedLabel: '11 days ago',
  },
  {
    id: 'cust-onb-24',
    rowIndex: 24,
    businessName: 'Silver Oak Resort',
    contactName: 'Prakash Rao',
    contactDate: '10 Sep 2026',
    email: 'prakash@silveroakresort.com',
    phone: '9733445566',
    callStatus: 'connected',
    status: 'completed',
    assigneeId: 'u-8',
    remark: 'Live website launched successfully.',
    updatedLabel: '14 days ago',
  },
]

/**
 * Customer Onboarding Page.
 * Holds all state, handles filtering and mutation logic,
 * and composes the reusable CustomersList components.
 */
export function CustomerListPage() {
  const [customers, setCustomers] =
    useState<OnboardingCustomer[]>(INITIAL_CUSTOMERS)
  const [activeTab, setActiveTab] = useState<CustomerTab>('pending')
  const [search, setSearch] = useState('')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<
    string | null | 'all'
  >('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailCustomer, setDetailCustomer] =
    useState<OnboardingCustomer | null>(null)

  // Counts calculated across all customer records
  const tabCounts = useMemo(() => {
    return {
      all: customers.length,
      pending: customers.filter((c) => c.status === 'pending').length,
      inProgress: customers.filter((c) => c.status === 'in-progress').length,
      completed: customers.filter((c) => c.status === 'completed').length,
    }
  }, [customers])

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return customers
      .filter((c) => {
        // Tab filter
        if (activeTab !== 'all' && c.status !== activeTab) return false

        // Assignee filter
        if (selectedAssigneeId === null) {
          if (c.assigneeId !== null) return false
        } else if (selectedAssigneeId !== 'all') {
          if (c.assigneeId !== selectedAssigneeId) return false
        }

        // Search query
        if (q) {
          const matched =
            c.businessName.toLowerCase().includes(q) ||
            c.contactName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.includes(q)
          if (!matched) return false
        }

        return true
      })
      .map((c, idx) => ({
        ...c,
        rowIndex: idx + 1,
      }))
  }, [customers, activeTab, selectedAssigneeId, search])

  // Actions / Mutations (in-memory state)
  function handleStatusChange(id: string, newStatus: OnboardingStatus) {
    setCustomers((prev: OnboardingCustomer[]) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    )
    if (detailCustomer?.id === id) {
      setDetailCustomer((prev: OnboardingCustomer | null) =>
        prev ? { ...prev, status: newStatus } : null,
      )
    }
  }

  function handleAssigneeChange(id: string, assigneeId: string | null) {
    setCustomers((prev: OnboardingCustomer[]) =>
      prev.map((c) => (c.id === id ? { ...c, assigneeId } : c)),
    )
    if (detailCustomer?.id === id) {
      setDetailCustomer((prev: OnboardingCustomer | null) =>
        prev ? { ...prev, assigneeId } : null,
      )
    }
  }

  function handleRemarkChange(id: string, remark: string) {
    setCustomers((prev: OnboardingCustomer[]) =>
      prev.map((c) => (c.id === id ? { ...c, remark } : c)),
    )
    if (detailCustomer?.id === id) {
      setDetailCustomer((prev: OnboardingCustomer | null) =>
        prev ? { ...prev, remark } : null,
      )
    }
  }

  function handleResetFilters() {
    setSearch('')
    setActiveTab('all')
    setSelectedAssigneeId('all')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="cl-page">
      {/* Search Bar + Filter Controls */}
      <CustomersListFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabCounts={tabCounts}
        searchSlot={
          <CustomersListSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, phone..."
          />
        }
        assignees={MOCK_ASSIGNEES}
        selectedAssigneeId={selectedAssigneeId}
        onAssigneeChange={setSelectedAssigneeId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(from: string, to: string) => {
          setDateFrom(from)
          setDateTo(to)
        }}
        onReset={handleResetFilters}
      />

      {/* Main Customers List / Table */}
      <CustomersList
        customers={filteredCustomers}
        assignees={MOCK_ASSIGNEES}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
        onRemarkChange={handleRemarkChange}
        onOpenDetail={setDetailCustomer}
      />

      {/* Customer Detail Drawer / Modal */}
      <CustomersListModal
        customer={detailCustomer}
        assignees={MOCK_ASSIGNEES}
        onClose={() => setDetailCustomer(null)}
      />
    </div>
  )
}
