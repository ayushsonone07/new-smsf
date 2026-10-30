import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomersListModal } from './CustomersListModal'
import type { OnboardingCustomer } from './CustomersList'

const {
  fetchBillingCustomersMock,
  uploadCustomerBillMock,
  updateBillingInvoiceMock,
} = vi.hoisted(() => ({
  fetchBillingCustomersMock: vi.fn(),
  uploadCustomerBillMock: vi.fn(),
  updateBillingInvoiceMock: vi.fn(),
}))

// Keep the real pure helpers (getBillUrl, getBillingInvoice, extractBillingCustomers,
// ...) and stub only the network-facing functions.
vi.mock('../../../api/billing.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/billing.api')>()
  return {
    ...actual,
    fetchBillingCustomers: fetchBillingCustomersMock,
    uploadCustomerBill: uploadCustomerBillMock,
    updateBillingInvoice: updateBillingInvoiceMock,
  }
})

vi.mock('../../../features/departments/hooks/useCustomerDrawerDetails', () => ({
  useCustomerDrawerDetails: () => ({
    profile: {
      ownerName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '9876543210',
    },
    serviceRows: [],
    serviceRowsLoading: false,
    remarks: undefined,
    internalRemarks: [],
    reviewReplies: [],
    isLoading: false,
    errors: [],
  }),
}))

vi.mock('../../../api/customers.api', () => ({
  updateCustomer: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../../api/department-users.api', () => ({
  getDuplicateCustomerSummaries: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../utils/customerActivity', () => ({
  CUSTOMER_ACTIVITY_EVENT: 'customer-activity',
  getCustomerActivities: () => [],
}))

// Notification events are fire-and-forget network calls; keep the component
// test focused on the billing flow instead of hitting a relative API URL.
vi.mock('../../../api/notification-factory', () => ({
  notifyBillGenerated: vi.fn(),
}))

vi.mock('../../../app/auth/session', () => ({
  getSession: () => ({
    token: 'test-token',
    user: {
      role: 'HEAD',
      email: 'head@example.com',
      username: 'head',
      departmentType: 'BILLING_DEPARTMENT',
    },
  }),
}))

const customer: OnboardingCustomer = {
  id: '42',
  rowIndex: 1,
  businessName: 'Acme Corp',
  contactName: 'Jane Doe',
  contactDate: '2026-01-01',
  email: 'jane@example.com',
  phone: '9876543210',
  status: 'pending',
  assigneeId: null,
  remark: '',
}

const billingRecord = {
  id: 42,
  ownerName: 'Jane Doe',
  businessName: 'Acme Corp',
  email: 'jane@example.com',
  phoneNumber: '9876543210',
  gstNumber: '23AGNPT5905E1ZB',
  amountPaid: '10000',
  amountPending: '0',
  billStatus: 'IN_PROGRESS',
  informationStatus: 'PROVIDED',
  generatedBillInfo: JSON.stringify({
    status: 'IN_PROGRESS',
    invoiceNo: 'INV-8831',
    invoiceDate: '2026-10-16',
    invoiceAmount: '0',
    generatedBillInfo: 'https://billing.example.com/bill.pdf',
  }),
}

function renderModal(props: Partial<Parameters<typeof CustomersListModal>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CustomersListModal
        customer={customer}
        assignees={[]}
        departmentType="BILLING_DEPARTMENT"
        onClose={() => {}}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...view, queryClient }
}

beforeEach(() => {
  fetchBillingCustomersMock.mockResolvedValue({
    success: true,
    data: [billingRecord],
  })
  uploadCustomerBillMock.mockResolvedValue({ success: true })
  updateBillingInvoiceMock.mockResolvedValue({
    success: true,
    data: billingRecord,
  })
})

describe('CustomersListModal — Bill Upload tab', () => {
  it('shows the Bill Upload tab first and selects it by default', () => {
    renderModal()

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveTextContent('Bill Upload')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    const labels = tabs.map((tab) => tab.textContent)
    expect(labels.indexOf('Bill Upload')).toBeLessThan(labels.indexOf('Overview'))
  })

  it('does not render the tab for non-billing departments', () => {
    renderModal({ departmentType: 'ONBOARDING_DEPARTMENT' })

    expect(
      screen.queryByRole('tab', { name: 'Bill Upload' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('loads billing data and seeds the editable invoice form', async () => {
    renderModal()

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()

    await waitFor(() =>
      expect(fetchBillingCustomersMock).toHaveBeenCalledWith(
        expect.objectContaining({ searchParam: '9876543210' }),
      ),
    )

    expect(screen.getByLabelText('Invoice No')).toHaveValue('INV-8831')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-16')
    expect(screen.getByLabelText('Amount')).toHaveValue('0')
    expect(screen.getByLabelText('Status')).toHaveValue('IN_PROGRESS')
    expect(screen.getByLabelText('Invoice / Bill Link')).toHaveValue(
      'https://billing.example.com/bill.pdf',
    )
  })

  it('renders Payment & GST values from the billing record', async () => {
    renderModal()

    expect(await screen.findByText('23AGNPT5905E1ZB')).toBeInTheDocument()
    expect(screen.getByText('₹10,000')).toBeInTheDocument()
    expect(screen.getByText('₹0')).toBeInTheDocument()
  })

  it('uploads the selected bill file', async () => {
    const user = userEvent.setup()
    const onBillUploaded = vi.fn()
    const { container } = renderModal({ onBillUploaded })

    await screen.findByText('23AGNPT5905E1ZB')

    const fileInput = container.querySelector<HTMLInputElement>(
      'input[type="file"]',
    )
    expect(fileInput).not.toBeNull()

    const file = new File(['bill'], 'bill.pdf', { type: 'application/pdf' })
    await user.upload(fileInput as HTMLInputElement, file)

    await user.click(screen.getByRole('button', { name: /upload bill/i }))

    await waitFor(() =>
      expect(uploadCustomerBillMock).toHaveBeenCalledWith(42, file),
    )
    expect(
      await screen.findByText(/bill uploaded successfully/i),
    ).toBeInTheDocument()
    expect(onBillUploaded).toHaveBeenCalledOnce()
  })

  it('saves the invoice and shows a confirmation', async () => {
    const user = userEvent.setup()
    renderModal()

    await screen.findByText('23AGNPT5905E1ZB')

    await user.click(screen.getByRole('button', { name: /save invoice/i }))

    await waitFor(() =>
      expect(updateBillingInvoiceMock).toHaveBeenCalledWith(42, {
        invoiceNo: 'INV-8831',
        invoiceDate: '2026-10-16',
        invoiceAmount: '0',
        status: 'IN_PROGRESS',
        billingLink: 'https://billing.example.com/bill.pdf',
      }),
    )
    expect(
      await screen.findByText(/invoice details saved/i),
    ).toBeInTheDocument()
  })

  it('requires an invoice number before saving', async () => {
    const user = userEvent.setup()
    renderModal()

    await screen.findByText('23AGNPT5905E1ZB')

    const invoiceNo = screen.getByLabelText('Invoice No')
    await user.clear(invoiceNo)
    await user.click(screen.getByRole('button', { name: /save invoice/i }))

    expect(
      await screen.findByText('Invoice number is required.'),
    ).toBeInTheDocument()
    expect(updateBillingInvoiceMock).not.toHaveBeenCalled()
  })

  it('requires a link when the invoice status is Generated', async () => {
    const user = userEvent.setup()
    renderModal()

    await screen.findByText('23AGNPT5905E1ZB')

    await user.selectOptions(screen.getByLabelText('Status'), 'GENERATED')
    await user.clear(screen.getByLabelText('Invoice / Bill Link'))
    await user.click(screen.getByRole('button', { name: /save invoice/i }))

    expect(
      await screen.findByText('Billing link is required when status is Generated.'),
    ).toBeInTheDocument()
    expect(updateBillingInvoiceMock).not.toHaveBeenCalled()
  })

  it('opens the uploaded bill in a new tab from View Bill', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    renderModal()

    await screen.findByText('23AGNPT5905E1ZB')

    await user.click(screen.getByRole('button', { name: 'View Bill' }))

    expect(openSpy).toHaveBeenCalledWith(
      'https://billing.example.com/bill.pdf',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
