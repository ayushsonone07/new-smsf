export interface PlanWithDepartments {
  id: string
  name: string
  description: string
  departments: string[]
}

export interface PlanAmount {
  planTypeId: string
  planName: string
  amount: number | null
  additionalAmount: number | null
  durationMonths: number | null
  enabled: boolean
}

/** Payload accepted by `POST /api/auth/customers/register`. */
export interface CustomerRegistrationRequest {
  clientName: string
  businessName: string
  clientEmail: string
  clientNumber: string
  city: string
  packageNames: string
  serviceMonth: string
  salesPersonName: string
  amountPaid: string
  totalAmountToBeTaken: string
  leadType: string
  remark: string
  isWebsiteIncluded: string
  gstinOrAddress: string
  remainingAmountDueDate: string
  whatsappGroupInviteLink: string
  source: string
  isWebinarClient: string
  onboardingCity: string
  paymentId?: string
}

/** Minimal identity kept after registration so the payment screenshot can be uploaded against it. */
export interface RegisteredCustomer {
  phone: string
  email: string
  businessName: string
  ownerName: string
  gstNumber: string
}
