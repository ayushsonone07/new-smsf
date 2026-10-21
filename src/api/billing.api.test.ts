import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import {
  extractBillingCustomers,
  fetchBillingCustomers,
  getBillingCustomers,
  getBillingInformation,
  getBillingInvoice,
  getBillUrl,
  normalizeBillStatus,
  normalizeInformationStatus,
  updateBillingInvoice,
  uploadCustomerBill,
  type BillingCustomer,
} from './billing.api'

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }))

// Keep the real ApiError class, stub only the network call.
vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, authedApiRequest: apiRequestMock }
})

beforeEach(() => {
  apiRequestMock.mockReset()
})

describe('extractBillingCustomers', () => {
  it('returns an empty list for missing responses', () => {
    expect(extractBillingCustomers(null)).toEqual([])
    expect(extractBillingCustomers(undefined)).toEqual([])
    expect(extractBillingCustomers({})).toEqual([])
  })

  it('reads customers from a plain data array', () => {
    const list = [{ id: 1 }, { id: 2 }] as BillingCustomer[]
    expect(extractBillingCustomers({ data: list })).toBe(list)
  })

  it('reads customers from nested data.content and data.customers', () => {
    const content = [{ id: 3 }] as BillingCustomer[]
    const customers = [{ id: 4 }] as BillingCustomer[]
    expect(extractBillingCustomers({ data: { content } })).toBe(content)
    expect(extractBillingCustomers({ data: { customers } })).toBe(customers)
  })

  it('reads customers from top-level content/customers', () => {
    const content = [{ id: 5 }] as BillingCustomer[]
    const customers = [{ id: 6 }] as BillingCustomer[]
    expect(extractBillingCustomers({ content })).toBe(content)
    expect(extractBillingCustomers({ customers })).toBe(customers)
  })
})

describe('normalizeBillStatus', () => {
  it('maps known statuses and defaults to PENDING', () => {
    expect(normalizeBillStatus('generated')).toBe('GENERATED')
    expect(normalizeBillStatus('IN_PROGRESS')).toBe('IN_PROGRESS')
    expect(normalizeBillStatus('pending')).toBe('PENDING')
    expect(normalizeBillStatus('something-else')).toBe('PENDING')
    expect(normalizeBillStatus(null)).toBe('PENDING')
    expect(normalizeBillStatus(undefined)).toBe('PENDING')
  })
})

describe('normalizeInformationStatus', () => {
  it('only PROVIDED counts as provided', () => {
    expect(normalizeInformationStatus('PROVIDED')).toBe('PROVIDED')
    expect(normalizeInformationStatus('provided')).toBe('PROVIDED')
    expect(normalizeInformationStatus('PENDING')).toBe('PENDING')
    expect(normalizeInformationStatus(undefined)).toBe('PENDING')
  })
})

describe('getBillUrl', () => {
  it('returns an empty string for a missing customer', () => {
    expect(getBillUrl(null)).toBe('')
    expect(getBillUrl(undefined)).toBe('')
  })

  it('accepts a plain http(s) URL stored in generatedBillInfo', () => {
    expect(
      getBillUrl({ id: 1, generatedBillInfo: 'https://cdn.example.com/bill.pdf' }),
    ).toBe('https://cdn.example.com/bill.pdf')
  })

  it('parses a serialized billing-details JSON string', () => {
    const customer: BillingCustomer = {
      id: 1,
      generatedBillInfo: JSON.stringify({
        status: 'GENERATED',
        generatedBillInfo: 'https://cdn.example.com/json-bill.pdf',
      }),
    }
    expect(getBillUrl(customer)).toBe('https://cdn.example.com/json-bill.pdf')
  })

  it('falls back to billingLink and billUrl keys', () => {
    expect(
      getBillUrl({
        id: 1,
        generatedBillInfo: JSON.stringify({ billingLink: 'https://a.example.com/x' }),
      }),
    ).toBe('https://a.example.com/x')
    expect(
      getBillUrl({
        id: 1,
        generatedBillInfo: JSON.stringify({ billUrl: 'https://b.example.com/y' }),
      }),
    ).toBe('https://b.example.com/y')
  })

  it('reads an object-valued generatedBillInfo', () => {
    expect(
      getBillUrl({
        id: 1,
        generatedBillInfo: { generatedBillInfo: 'https://obj.example.com/z' },
      }),
    ).toBe('https://obj.example.com/z')
  })

  it('ignores non-http values and falls back to top-level fields', () => {
    expect(getBillUrl({ id: 1, generatedBillInfo: 'not-a-url' })).toBe('')
    expect(
      getBillUrl({ id: 1, generatedBillInfo: null, billingLink: 'https://top.example.com/b' }),
    ).toBe('https://top.example.com/b')
  })
})

describe('getBillingInformation', () => {
  it('derives labels and flags for a generated + provided record', () => {
    const info = getBillingInformation({
      id: 1,
      billStatus: 'GENERATED',
      informationStatus: 'PROVIDED',
      generatedBillInfo: 'https://cdn.example.com/bill.pdf',
    })
    expect(info).toEqual({
      billStatus: 'GENERATED',
      billStatusLabel: 'Generated',
      isGenerated: true,
      informationStatus: 'PROVIDED',
      informationStatusLabel: 'Provided',
      billUrl: 'https://cdn.example.com/bill.pdf',
    })
  })

  it('defaults to PENDING when the customer is missing', () => {
    const info = getBillingInformation(null)
    expect(info.billStatus).toBe('PENDING')
    expect(info.informationStatus).toBe('PENDING')
    expect(info.isGenerated).toBe(false)
    expect(info.billUrl).toBe('')
  })
})

describe('getBillingInvoice', () => {
  it('returns empty defaults without a customer', () => {
    expect(getBillingInvoice(null)).toEqual({
      invoiceNo: '',
      invoiceDate: '',
      invoiceAmount: '',
      status: 'PENDING',
      billingLink: '',
    })
  })

  it('parses invoice fields out of serialized billing details', () => {
    const customer: BillingCustomer = {
      id: 42,
      billStatus: 'IN_PROGRESS',
      generatedBillInfo: JSON.stringify({
        status: 'IN_PROGRESS',
        invoiceNo: 'INV-8831',
        invoiceDate: '2026-10-16',
        invoiceAmount: '0',
        generatedBillInfo: 'https://billing.example.com/bill.pdf',
      }),
    }

    expect(getBillingInvoice(customer)).toEqual({
      invoiceNo: 'INV-8831',
      invoiceDate: '2026-10-16',
      invoiceAmount: '0',
      status: 'IN_PROGRESS',
      billingLink: 'https://billing.example.com/bill.pdf',
    })
  })

  it('falls back to the top-level bill status and link', () => {
    const customer: BillingCustomer = {
      id: 7,
      billStatus: 'GENERATED',
      generatedBillInfo: 'https://cdn.example.com/direct.pdf',
    }

    const invoice = getBillingInvoice(customer)
    expect(invoice.status).toBe('GENERATED')
    expect(invoice.billingLink).toBe('https://cdn.example.com/direct.pdf')
    expect(invoice.invoiceNo).toBe('')
  })
})

describe('fetchBillingCustomers', () => {
  it('builds the paginated query string and returns the response', async () => {
    const response = { success: true, data: [] }
    apiRequestMock.mockResolvedValue(response)

    await expect(
      fetchBillingCustomers({ page: 0, size: 10, searchParam: '9876543210' }),
    ).resolves.toBe(response)

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/billing/customers?page=0&size=10&searchParam=9876543210',
    )
  })

  it('omits an empty searchParam', async () => {
    apiRequestMock.mockResolvedValue({ success: true, data: [] })
    await fetchBillingCustomers({ page: 2, size: 25, searchParam: '   ' })
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/billing/customers?page=2&size=25',
    )
  })

  it('throws an ApiError when the envelope reports failure', async () => {
    apiRequestMock.mockResolvedValue({ success: false, message: 'nope' })
    await expect(fetchBillingCustomers()).rejects.toBeInstanceOf(ApiError)
    await expect(fetchBillingCustomers()).rejects.toThrow('nope')
  })

  it('returns an empty object when the API resolves nothing', async () => {
    apiRequestMock.mockResolvedValue(undefined)
    await expect(fetchBillingCustomers()).resolves.toEqual({})
  })
})

describe('getBillingCustomers', () => {
  it('translates a numeric argument into a page size', async () => {
    apiRequestMock.mockResolvedValue({ success: true, data: [] })
    await getBillingCustomers(100)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/billing/customers?page=0&size=100',
    )
  })

  it('merges object arguments over the defaults', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      data: [{ id: 1 }],
    })
    const result = await getBillingCustomers({ size: 5, searchParam: 'acme' })
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/billing/customers?page=0&size=5&searchParam=acme',
    )
    expect(result).toEqual([{ id: 1 }])
  })
})

describe('uploadCustomerBill', () => {
  it('posts a multipart FormData body containing the file', async () => {
    apiRequestMock.mockResolvedValue({ success: true })
    const file = new File(['hello'], 'bill.pdf', { type: 'application/pdf' })

    await uploadCustomerBill(42, file)

    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    const [endpoint, options] = apiRequestMock.mock.calls[0]
    expect(endpoint).toBe('/api/billing/customers/42/bill/upload')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).get('file')).toBe(file)
  })

  it('throws an ApiError when the upload reports failure', async () => {
    apiRequestMock.mockResolvedValue({ success: false, message: 'too big' })
    const file = new File(['x'], 'bill.pdf')
    await expect(uploadCustomerBill(42, file)).rejects.toBeInstanceOf(ApiError)
    await expect(uploadCustomerBill(42, file)).rejects.toThrow('too big')
  })
})

describe('updateBillingInvoice', () => {
  it('PUTs the invoice payload and returns the updated customer', async () => {
    const updated = { id: 42, invoiceNo: 'INV-1' }
    apiRequestMock.mockResolvedValue({ success: true, data: updated })

    const input = {
      invoiceNo: 'INV-1',
      invoiceDate: '2026-10-16',
      invoiceAmount: '500',
      status: 'GENERATED',
      billingLink: 'https://billing.example.com/bill.pdf',
    }
    const result = await updateBillingInvoice(42, input)

    expect(result).toBe(updated)
    const [endpoint, options] = apiRequestMock.mock.calls[0]
    expect(endpoint).toBe('/api/billing/customers/42/invoice')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body as string)).toEqual(input)
  })

  it('resolves to null when there is no data', async () => {
    apiRequestMock.mockResolvedValue({ success: true })
    await expect(
      updateBillingInvoice(1, { invoiceNo: 'x', status: 'PENDING' }),
    ).resolves.toBeNull()
  })
})
