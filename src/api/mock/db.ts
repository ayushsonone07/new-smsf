import type { Department } from '../../features/departments/types/department.types'
import type { IconName } from '../../components/head/shared/iconPaths'
import type {
  FeaturePermission,
  HeadScreenKey,
  PermissionLevel,
} from '../../features/permissions/types/permission.types'
import type { Customer } from '../../features/departments/types/customer.types'
import type { Service } from '../../features/departments/types/service.types'
import type { HelpArticle } from '../../features/departments/types/help-center.types'
import type {
  ActivityItem,
  DepartmentDashboard,
} from '../../features/departments/types/dashboard.types'
import {
  COLUMN_TEMPLATES,
  categoryMeta,
} from '../../features/permissions/config/featureCategories'
import {
  readPersisted,
  writePersisted,
} from './persist'

export const FEATURE_TEMPLATE: Array<{
  name: string
  description: string
  screen: HeadScreenKey
  slug: string
  icon: IconName
  defaultEnabled: boolean
}> = [
  {
    name: 'Dashboard',
    description: 'Monitor team onboarding performance',
    screen: 'dashboard',
    slug: 'dashboard',
    icon: 'grid',
    defaultEnabled: true,
  },
  {
    name: 'Department Users',
    description: 'Manage department users and sub-users',
    screen: 'users',
    slug: 'users',
    icon: 'userPlus',
    defaultEnabled: true,
  },
  {
    name: 'Customer List',
    description: 'Manage and track your customer onboarding process',
    screen: 'customers',
    slug: 'customers',
    icon: 'list',
    defaultEnabled: true,
  },
  {
    name: '15 Days Meeting',
    description: 'Track and manage customer 15-day onboarding meetings',
    screen: 'meeting',
    slug: 'meeting',
    icon: 'calendar',
    defaultEnabled: true,
  },
  {
    name: 'SOP',
    description:
      'Set the steps and statuses for each department — status updates follow the SOP',
    screen: 'sop',
    slug: 'sop',
    icon: 'flow',
    defaultEnabled: true,
  },
  {
    name: 'Help Center',
    description: 'Customer tickets — assign manually or by round robin',
    screen: 'help-center',
    slug: 'help-center',
    icon: 'help',
    defaultEnabled: true,
  },
  {
    name: 'Reports',
    description: 'Generate and export reports',
    screen: 'custom',
    slug: 'reports',
    icon: 'bar',
    defaultEnabled: false,
  },
]

export const departments: Department[] = [
  {
    id: 'dept-1',
    name: 'Finance',
    username: 'finance.dept',
    email: 'finance@smsf.test',
    status: 'ACTIVE',
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'dept-2',
    name: 'Operations',
    username: 'operations.dept',
    email: 'operations@smsf.test',
    status: 'ACTIVE',
    createdAt: '2026-03-04T08:30:00.000Z',
  },
]

export const featurePermissions: FeaturePermission[] = []

export const customers: Customer[] = [
  {
    id: 'cust-1',
    departmentId: 'dept-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+1 555 0101',
    company: 'Northwind Traders',
    status: 'ACTIVE',
    createdAt: '2026-01-15T09:15:00.000Z',
  },
  {
    id: 'cust-2',
    departmentId: 'dept-1',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+1 555 0102',
    company: 'Acme Corp',
    status: 'ACTIVE',
    createdAt: '2026-01-22T14:40:00.000Z',
  },
  {
    id: 'cust-3',
    departmentId: 'dept-1',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+1 555 0103',
    company: 'Globex',
    status: 'INACTIVE',
    createdAt: '2026-02-03T11:05:00.000Z',
  },
  {
    id: 'cust-4',
    departmentId: 'dept-1',
    name: 'Sneha Gupta',
    email: 'sneha.gupta@example.com',
    phone: '+1 555 0104',
    company: 'Initech',
    status: 'ACTIVE',
    createdAt: '2026-02-18T16:25:00.000Z',
  },
  {
    id: 'cust-5',
    departmentId: 'dept-1',
    name: 'Karan Mehta',
    email: 'karan.mehta@example.com',
    phone: '+1 555 0105',
    company: 'Umbrella',
    status: 'ACTIVE',
    createdAt: '2026-03-01T10:50:00.000Z',
  },
  {
    id: 'cust-6',
    departmentId: 'dept-1',
    name: 'Anika Shah',
    email: 'anika.shah@example.com',
    phone: '+1 555 0106',
    company: 'Hooli',
    status: 'INACTIVE',
    createdAt: '2026-03-12T13:35:00.000Z',
  },
  {
    id: 'cust-7',
    departmentId: 'dept-2',
    name: 'Vikram Nair',
    email: 'vikram.nair@example.com',
    phone: '+1 555 0107',
    company: 'Stark Industries',
    status: 'ACTIVE',
    createdAt: '2026-03-05T08:20:00.000Z',
  },
  {
    id: 'cust-8',
    departmentId: 'dept-2',
    name: 'Meera Iyer',
    email: 'meera.iyer@example.com',
    phone: '+1 555 0108',
    company: 'Wayne Enterprises',
    status: 'ACTIVE',
    createdAt: '2026-03-09T12:10:00.000Z',
  },
  {
    id: 'cust-9',
    departmentId: 'dept-2',
    name: 'Arjun Rao',
    email: 'arjun.rao@example.com',
    phone: '+1 555 0109',
    company: 'Massive Dynamic',
    status: 'INACTIVE',
    createdAt: '2026-03-14T09:45:00.000Z',
  },
  {
    id: 'cust-10',
    departmentId: 'dept-2',
    name: 'Ishita Menon',
    email: 'ishita.menon@example.com',
    phone: '+1 555 0110',
    company: 'Cyberdyne',
    status: 'ACTIVE',
    createdAt: '2026-03-20T15:30:00.000Z',
  },
  {
    id: 'cust-11',
    departmentId: 'dept-2',
    name: 'Rohan Khanna',
    email: 'rohan.khanna@example.com',
    phone: '+1 555 0111',
    company: 'Tyrell Corp',
    status: 'ACTIVE',
    createdAt: '2026-03-25T10:00:00.000Z',
  },
]

export const services: Service[] = [
  {
    id: 'svc-1',
    departmentId: 'dept-1',
    name: 'Invoice Processing',
    description: 'Generate and process customer invoices',
    category: 'Billing',
    status: 'AVAILABLE',
  },
  {
    id: 'svc-2',
    departmentId: 'dept-1',
    name: 'Payment Reconciliation',
    description: 'Match incoming payments to open invoices',
    category: 'Billing',
    status: 'AVAILABLE',
  },
  {
    id: 'svc-3',
    departmentId: 'dept-1',
    name: 'Financial Reporting',
    description: 'Monthly and quarterly financial reports',
    category: 'Reporting',
    status: 'AVAILABLE',
  },
  {
    id: 'svc-4',
    departmentId: 'dept-1',
    name: 'Tax Compliance',
    description: 'GST and tax filing support',
    category: 'Compliance',
    status: 'UNAVAILABLE',
  },
  {
    id: 'svc-5',
    departmentId: 'dept-2',
    name: 'Order Fulfillment',
    description: 'Process and ship customer orders',
    category: 'Operations',
    status: 'AVAILABLE',
  },
  {
    id: 'svc-6',
    departmentId: 'dept-2',
    name: 'Inventory Management',
    description: 'Track stock levels and reorders',
    category: 'Operations',
    status: 'AVAILABLE',
  },
  {
    id: 'svc-7',
    departmentId: 'dept-2',
    name: 'Logistics Coordination',
    description: 'Coordinate shipments and carriers',
    category: 'Logistics',
    status: 'AVAILABLE',
  },
  {
    id: 'svc-8',
    departmentId: 'dept-2',
    name: 'Quality Assurance',
    description: 'Inspect and approve outgoing orders',
    category: 'Quality',
    status: 'UNAVAILABLE',
  },
]

export const helpArticles: HelpArticle[] = [
  {
    id: 'help-1',
    departmentId: 'dept-1',
    title: 'Getting started with the Finance portal',
    category: 'Getting Started',
    excerpt: 'Learn how to navigate the dashboard, find invoices, and manage your account.',
    updatedAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'help-2',
    departmentId: 'dept-1',
    title: 'Creating your first invoice',
    category: 'Invoices',
    excerpt: 'Step-by-step guide to creating, sending, and tracking invoices.',
    updatedAt: '2026-02-18T11:30:00.000Z',
  },
  {
    id: 'help-3',
    departmentId: 'dept-1',
    title: 'Reconciling payments',
    category: 'Payments',
    excerpt: 'Match incoming payments to open invoices and resolve mismatches.',
    updatedAt: '2026-03-02T14:15:00.000Z',
  },
  {
    id: 'help-4',
    departmentId: 'dept-1',
    title: 'Understanding financial reports',
    category: 'Reports',
    excerpt: 'Read balance sheets, profit and loss, and cash flow statements.',
    updatedAt: '2026-03-15T10:45:00.000Z',
  },
  {
    id: 'help-5',
    departmentId: 'dept-2',
    title: 'Getting started with the Operations portal',
    category: 'Getting Started',
    excerpt: 'Learn how to navigate orders, inventory, and shipment tracking.',
    updatedAt: '2026-03-06T08:30:00.000Z',
  },
  {
    id: 'help-6',
    departmentId: 'dept-2',
    title: 'Managing customer orders',
    category: 'Orders',
    excerpt: 'Create, update, and fulfil customer orders efficiently.',
    updatedAt: '2026-03-11T13:00:00.000Z',
  },
  {
    id: 'help-7',
    departmentId: 'dept-2',
    title: 'Tracking inventory',
    category: 'Inventory',
    excerpt: 'Monitor stock levels, set reorder points, and avoid shortages.',
    updatedAt: '2026-03-19T09:20:00.000Z',
  },
  {
    id: 'help-8',
    departmentId: 'dept-2',
    title: 'Coordinating shipments',
    category: 'Logistics',
    excerpt: 'Assign carriers, generate labels, and track deliveries.',
    updatedAt: '2026-03-24T16:40:00.000Z',
  },
]

const activityByDepartment: Record<string, ActivityItem[]> = {
  'dept-1': [
    {
      id: 'act-1',
      title: 'Invoice #INV-2041 created',
      description: 'A new invoice was generated for Northwind Traders.',
      time: '12 min ago',
    },
    {
      id: 'act-2',
      title: 'Payment reconciled',
      description: 'Payment of $4,250.00 matched to invoice INV-2038.',
      time: '1 hour ago',
    },
    {
      id: 'act-3',
      title: 'New customer added',
      description: 'Karan Mehta from Umbrella was added to the portal.',
      time: '3 hours ago',
    },
    {
      id: 'act-4',
      title: 'Monthly report ready',
      description: 'The March financial report is ready to download.',
      time: 'Yesterday',
    },
  ],
  'dept-2': [
    {
      id: 'act-5',
      title: 'Order #ORD-882 fulfilled',
      description: 'Order for Wayne Enterprises was shipped via carrier.',
      time: '8 min ago',
    },
    {
      id: 'act-6',
      title: 'Inventory restocked',
      description: 'Reorder point reached for 3 items; stock updated.',
      time: '2 hours ago',
    },
    {
      id: 'act-7',
      title: 'Shipment delayed',
      description: 'Shipment for Massive Dynamic is delayed by 1 day.',
      time: '5 hours ago',
    },
    {
      id: 'act-8',
      title: 'Quality check passed',
      description: 'Outgoing order ORD-879 passed inspection.',
      time: 'Yesterday',
    },
  ],
}

const openTicketsByDepartment: Record<string, number> = {
  'dept-1': 3,
  'dept-2': 5,
}

let departmentIdCounter = departments.length + 1
let featureIdCounter = 1
let customerIdCounter = customers.length + 1
let serviceIdCounter = services.length + 1
let helpArticleIdCounter = helpArticles.length + 1

export function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function nextDepartmentId(): string {
  const id = `dept-${departmentIdCounter}`
  departmentIdCounter += 1
  return id
}

export function nextFeatureId(): string {
  const id = `feat-${featureIdCounter}`
  featureIdCounter += 1
  return id
}

export function nextCustomerId(): string {
  const id = `cust-${customerIdCounter}`
  customerIdCounter += 1
  return id
}

export function nextServiceId(): string {
  const id = `svc-${serviceIdCounter}`
  serviceIdCounter += 1
  return id
}

export function nextHelpArticleId(): string {
  const id = `help-${helpArticleIdCounter}`
  helpArticleIdCounter += 1
  return id
}

export function seedFeaturePermissions(
  departmentId: string,
): FeaturePermission[] {
  const defaults: PermissionLevel[] = ['CAN_READ', 'CAN_EDIT']
  const created: FeaturePermission[] = []

  FEATURE_TEMPLATE.forEach((feature, index) => {
    created.push({
      id: nextFeatureId(),
      departmentId,
      name: feature.name,
      description: feature.description,
      enabled: feature.defaultEnabled,
      roleAPermission: defaults[index % 2],
      roleBPermission: 'CAN_READ',
      screen: feature.screen,
      slug: feature.slug,
      icon: feature.icon,
      order: created.length,
      category: 'screens',
      kind: 'screen',
    })
  })

  // Column features — one block per table, so the admin can
  // enable/disable every column of Customer List / Department
  // Users independently.
  for (const category of ['customers', 'users'] as const) {
    for (const column of COLUMN_TEMPLATES[category]) {
      created.push({
        id: nextFeatureId(),
        departmentId,
        name: column.name,
        description: column.description,
        enabled: true,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: column.roleBDefault ?? 'CAN_EDIT',
        screen: category === 'customers' ? 'customers' : 'users',
        slug: `col-${category}-${column.columnKey}`,
        icon: categoryMeta(category).icon,
        order: created.length,
        category,
        kind: 'column',
        columnKey: column.columnKey,
      })
    }
  }

  featurePermissions.push(...created)

  return created
}

export function removeFeaturePermissions(
  departmentId: string,
): void {
  const remaining = featurePermissions.filter(
    (feature) => feature.departmentId !== departmentId,
  )

  featurePermissions.length = 0
  featurePermissions.push(...remaining)
}

export function getDepartmentDashboardData(
  departmentId: string,
): DepartmentDashboard {
  const departmentCustomers = customers.filter(
    (customer) => customer.departmentId === departmentId,
  )
  const departmentServices = services.filter(
    (service) => service.departmentId === departmentId,
  )

  return {
    departmentId,
    stats: {
      totalCustomers: departmentCustomers.length,
      activeCustomers: departmentCustomers.filter(
        (customer) => customer.status === 'ACTIVE',
      ).length,
      openTickets: openTicketsByDepartment[departmentId] ?? 0,
      activeServices: departmentServices.filter(
        (service) => service.status === 'AVAILABLE',
      ).length,
    },
    activity: structuredClone(activityByDepartment[departmentId] ?? []),
  }
}

const MOCK_DB_KEY = 'db'
const MOCK_DB_VERSION = 1

interface MockDbSnapshot {
  departments: Department[]
  featurePermissions: FeaturePermission[]
  departmentIdCounter: number
  featureIdCounter: number
}

/**
 * Departments + feature permissions are kept in localStorage so an
 * admin's enable/disable work survives reloads, new tabs and dev
 * HMR — the previous in-memory store reset on every refresh.
 */
export function persistMockDb(): void {
  writePersisted<MockDbSnapshot>(MOCK_DB_KEY, MOCK_DB_VERSION, {
    departments,
    featurePermissions,
    departmentIdCounter,
    featureIdCounter,
  })
}

function replaceAll<T>(target: T[], source: T[]): void {
  target.length = 0
  target.push(...source)
}

const storedDb = readPersisted<MockDbSnapshot>(
  MOCK_DB_KEY,
  MOCK_DB_VERSION,
)

if (storedDb) {
  replaceAll(departments, storedDb.departments)
  replaceAll(featurePermissions, storedDb.featurePermissions)
  departmentIdCounter = storedDb.departmentIdCounter
  featureIdCounter = storedDb.featureIdCounter
} else {
  seedFeaturePermissions('dept-1')
  seedFeaturePermissions('dept-2')
  persistMockDb()
}
