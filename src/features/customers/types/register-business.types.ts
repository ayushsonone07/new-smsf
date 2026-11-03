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
  featureList?: string[]
}

export interface GstAddressDetails {
  buildingNumber: string
  buildingName: string
  floor: string
  street: string
  locality: string
  district: string
  city: string
  state: string
  pincode: string
  landmark: string
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
  /** Registered address captured from the GST lookup, when the invoice is GSTIN-based. */
  gstAddress?: GstAddressDetails
  remainingAmountDueDate: string
  whatsappGroupInviteLink: string
  source: string
  isWebinarClient: string
  onboardingCity: string
  paymentId?: string
  /** Encrypted stand-in for paymentId when the payment was picked from the masked list. */
  paymentRef?: string
  /** Further payments that top up the first one's remaining balance, used in order. */
  additionalPaymentIds?: string[]
  additionalPaymentRefs?: string[]
  discountPercent?: string
  discountAmount?: string
  originalAmount?: string
  includeGst?: boolean
  isGstIncluded?: string
  gstRate?: string
  gstPercent?: string
  gstAmount?: string
  gst?: string
  baseAmountWithoutGst?: string
}

/** Minimal identity kept after registration so the payment screenshot can be uploaded against it. */
export interface RegisteredCustomer {
  phone: string
  email: string
  businessName: string
  ownerName: string
  gstNumber: string
}
