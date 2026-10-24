import React, { useState, useEffect } from 'react'
import {
  X,
  Crown,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  Zap,
  DollarSign,
} from 'lucide-react'
import { generateLeadPaymentLink, type LeadInfo } from '../../../api/leads.api'
import payULogo from '../../../assets/payU.png'
import easebuzzLogo from '../../../assets/easebuzz.webp'

interface GeneratePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  lead: LeadInfo | null
  onSuccess: (url: string) => void
}

interface PackagePlan {
  name: string
  amount: number
  description: string
  iconColor: string
  borderColor: string
  hoverBorderColor: string
  textColor: string
}

const PACKAGE_PLANS: Record<string, PackagePlan> = {
  Silver: {
    name: 'Silver',
    amount: 14999,
    description: 'Perfect starter pack 🚀',
    iconColor: 'text-slate-500',
    borderColor: 'border-slate-200',
    hoverBorderColor: 'hover:border-slate-400',
    textColor: 'text-slate-700',
  },
  Gold: {
    name: 'Gold',
    amount: 24999,
    description: 'Most popular choice ⭐',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-300',
    hoverBorderColor: 'hover:border-amber-400',
    textColor: 'text-amber-600',
  },
  Diamond: {
    name: 'Diamond',
    amount: 49999,
    description: 'Complete domination 💎',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-300',
    hoverBorderColor: 'hover:border-blue-400',
    textColor: 'text-blue-600',
  },
}

interface GatewayItem {
  id: 'RAZORPAY' | 'PAYU' | 'EASEBUZZ' | 'CASHFREE'
  name: string
  description: string
  logoUrl?: string
  icon: typeof CreditCard
  color: string
  borderColor: string
  hoverBorder: string
  recommended?: boolean
}

const GATEWAYS: GatewayItem[] = [
  {
    id: 'RAZORPAY',
    name: 'Razorpay',
    description: 'Popular Indian payment gateway with UPI, cards, wallets',
    logoUrl: 'https://razorpay.com/favicon.png',
    icon: CreditCard,
    color: 'text-blue-600',
    borderColor: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    recommended: true,
  },
  {
    id: 'PAYU',
    name: 'PayU',
    description: 'Trusted payment solution with multiple payment options',
    logoUrl: payULogo,
    icon: Wallet,
    color: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400',
  },
  {
    id: 'EASEBUZZ',
    name: 'EaseBuzz',
    description: 'Fast and secure payment processing solution',
    logoUrl: easebuzzLogo,
    icon: Zap,
    color: 'text-purple-600',
    borderColor: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
  },
  {
    id: 'CASHFREE',
    name: 'Cashfree',
    description: 'Leading payment gateway for businesses in India',
    logoUrl: 'https://www.cashfree.com/favicon.ico',
    icon: DollarSign,
    color: 'text-orange-600',
    borderColor: 'border-orange-200',
    hoverBorder: 'hover:border-orange-400',
  },
]

export const GeneratePaymentModal: React.FC<GeneratePaymentModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  // Step: 'choose_package' | 'select_gateway' | 'summary' | 'success'
  const [step, setStep] = useState<'choose_package' | 'select_gateway' | 'summary' | 'success'>('choose_package')

  const [selectedPlan, setSelectedPlan] = useState<string>('Gold')
  const [baseAmount, setBaseAmount] = useState<number>(24999)
  const [customInputAmount, setCustomInputAmount] = useState<string>('')

  // Gateway selection
  const [selectedGateway, setSelectedGateway] = useState<'RAZORPAY' | 'PAYU' | 'EASEBUZZ' | 'CASHFREE'>('RAZORPAY')
  const [expandedGateway, setExpandedGateway] = useState<string | null>('RAZORPAY')

  // Summary options
  const [includeGST, setIncludeGST] = useState<boolean>(true)
  const [discount, setDiscount] = useState<number>(0)
  const [expireInHours, setExpireInHours] = useState<number>(1)

  // Customer contact fields
  const [customerEmail, setCustomerEmail] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (lead && isOpen) {
      setStep('choose_package')
      setSelectedPlan('Gold')
      setBaseAmount(24999)
      setCustomInputAmount('')
      setSelectedGateway('RAZORPAY')
      setExpandedGateway('RAZORPAY')
      setIncludeGST(true)
      setDiscount(0)
      setExpireInHours(1)

      const email = lead.businessEmail && lead.businessEmail.includes('@') ? lead.businessEmail.trim() : ''
      setCustomerEmail(email)
      const phone = lead.contact ? lead.contact.replace(/\D/g, '').slice(-10) : ''
      setCustomerPhone(phone)
      setDescription('')
      setError(null)
      setGeneratedUrl(null)
      setCopied(false)
    }
  }, [lead, isOpen])

  if (!isOpen || !lead) return null

  // Calculation
  const gstAmount = includeGST ? Math.round(baseAmount * 0.18) : 0
  const totalAmount = Math.max(0, baseAmount + gstAmount - discount)

  const handleSelectPackage = (planName: string, amount: number) => {
    setSelectedPlan(planName)
    setBaseAmount(amount)
    setStep('select_gateway')
    setError(null)
  }

  const handleSetCustomAmount = () => {
    const val = Number(customInputAmount)
    if (!val || val < 1) {
      setError('Please enter a valid custom amount (≥ ₹1)')
      return
    }
    setSelectedPlan('Custom')
    setBaseAmount(val)
    setStep('select_gateway')
    setError(null)
  }

  const handleGatewayCardClick = (gwId: 'RAZORPAY' | 'PAYU' | 'EASEBUZZ' | 'CASHFREE') => {
    setSelectedGateway(gwId)
    setExpandedGateway(expandedGateway === gwId ? null : gwId)
  }

  const handleProceedToSummary = (gwId?: 'RAZORPAY' | 'PAYU' | 'EASEBUZZ' | 'CASHFREE') => {
    if (gwId) setSelectedGateway(gwId)
    setStep('summary')
    setError(null)
  }

  const handleGenerateLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (totalAmount <= 0) {
      setError('Total payable amount must be greater than ₹0')
      return
    }

    const cleanPhone = customerPhone.trim().replace(/\D/g, '').slice(-10)
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('A valid 10-digit customer mobile number is required.')
      return
    }

    const emailRegex = /^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/
    let finalEmail = (customerEmail || lead.businessEmail || '').trim()
    if (!finalEmail || !emailRegex.test(finalEmail)) {
      finalEmail = `${(lead.ownerName || 'customer').replace(/\s+/g, '').toLowerCase()}@mbgcard.com`
    }

    setLoading(true)
    try {
      const res = await generateLeadPaymentLink({
        leadId: lead.leadId,
        amount: totalAmount,
        customerName: lead.ownerName || lead.businessName || 'Customer',
        customerEmail: finalEmail,
        customerPhone: `+91${cleanPhone}`,
        plan: selectedPlan,
        description: description || `${selectedPlan} Plan Payment`,
        expireInHours,
      })

      setGeneratedUrl(res.shortUrl)
      setStep('success')
      onSuccess(res.shortUrl)
    } catch (err: any) {
      setError(err?.message || 'Failed to generate payment link. Please check customer details.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[999999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* ================= STEP 1: CHOOSE PACKAGE ================= */}
        {step === 'choose_package' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-900">Choose Package</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Select a plan for <strong className="text-slate-800">{lead.ownerName || 'na'}</strong> ({lead.businessName || 'na'})
            </p>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* 3 Preset Package Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {Object.entries(PACKAGE_PLANS).map(([key, plan]) => (
                <div
                  key={key}
                  onClick={() => handleSelectPackage(plan.name, plan.amount)}
                  className={`cursor-pointer rounded-2xl border-2 ${plan.borderColor} ${plan.hoverBorderColor} bg-white p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className={`text-base font-bold ${plan.textColor}`}>{plan.name}</h3>
                      <Crown className={`w-4 h-4 ${plan.iconColor}`} />
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    ₹{plan.amount.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-500 ml-1">+ GST</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Payment Box */}
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <h3 className="text-base font-bold text-slate-900 mb-3">Custom Payment</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="customAmountInput" className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">
                      ₹
                    </span>
                    <input
                      id="customAmountInput"
                      type="number"
                      min="1"
                      value={customInputAmount}
                      onChange={(e) => setCustomInputAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSetCustomAmount}
                  disabled={!customInputAmount || Number(customInputAmount) < 1}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs ${
                    !customInputAmount || Number(customInputAmount) < 1
                      ? 'bg-blue-300 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  Set Custom Amount
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SELECT PAYMENT GATEWAY (Matching Screenshots) ================= */}
        {step === 'select_gateway' && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Select Payment Gateway</h2>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('choose_package')
                    setError(null)
                  }}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Packages</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selected Package Card (Light Green Card) */}
            <div className="mb-5 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/90">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-3">
                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Selected Package</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 ${
                    selectedPlan === 'Gold'
                      ? 'border-amber-300 bg-amber-50 text-amber-500'
                      : selectedPlan === 'Diamond'
                      ? 'border-blue-300 bg-blue-50 text-blue-500'
                      : selectedPlan === 'Custom'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                      : 'border-slate-300 bg-slate-50 text-slate-500'
                  }`}
                >
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    {selectedPlan}
                  </h4>
                  <div className="text-2xl font-black text-slate-900 leading-tight">
                    ₹{baseAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedPlan === 'Gold'
                      ? 'Most popular choice ⭐'
                      : selectedPlan === 'Diamond'
                      ? 'Complete domination 💎'
                      : selectedPlan === 'Custom'
                      ? 'Your way, your price 💰'
                      : 'Perfect starter pack 🚀'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3.5">
              Choose payment gateway for <strong className="text-slate-800">{lead.ownerName || 'na'}</strong> - ₹{baseAmount.toLocaleString('en-IN')}
            </p>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Gateway Stacked Options */}
            <div className="space-y-3 mb-6">
              {GATEWAYS.map((gw) => {
                const isSelected = selectedGateway === gw.id
                const isExpanded = expandedGateway === gw.id
                const Icon = gw.icon

                return (
                  <div
                    key={gw.id}
                    onClick={() => handleGatewayCardClick(gw.id)}
                    className={`rounded-2xl border-2 transition-all duration-200 p-3.5 cursor-pointer bg-white ${
                      gw.borderColor
                    } ${gw.hoverBorder} ${
                      isSelected ? 'ring-2 ring-blue-500/30 shadow-sm' : 'hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {gw.logoUrl ? (
                          <img
                            src={gw.logoUrl}
                            alt={gw.name}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <Icon className={`w-5 h-5 ${gw.color}`} />
                        )}
                        <h3 className={`text-sm font-bold ${gw.color} flex items-center gap-2`}>
                          <span>{gw.name}</span>
                          {gw.recommended && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                              Recommended
                            </span>
                          )}
                        </h3>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 pl-7.5">{gw.description}</p>

                    {/* Expandable Pay Button */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProceedToSummary(gw.id)
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Continue with {gw.name}</span>
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 3: CONFIRM PAYMENT DETAILS (Exact Match to SMSF) ================= */}
        {step === 'summary' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Confirm Payment Details</h2>

            {/* Customer Details */}
            <div className="mb-4">
              <div className="font-bold text-slate-700 text-sm mb-1">Customer Details</div>
              <div className="text-sm text-slate-800">
                {lead.ownerName || 'na'} ({lead.businessEmail || customerEmail || 'na'})
              </div>
              <div className="text-xs text-slate-500">{lead.businessName || 'na'}</div>
              <div className="text-xs text-slate-500">Contact: {customerPhone || lead.contact || '—'}</div>
            </div>

            {/* Selected Package */}
            <div className="mb-4">
              <div className="font-bold text-slate-700 text-sm mb-1">Selected Package</div>
              <div className="text-sm text-slate-800">
                {selectedPlan.toUpperCase()} - ₹{baseAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Payment Gateway */}
            <div className="mb-4">
              <div className="font-bold text-slate-700 text-sm mb-1">Payment Gateway</div>
              <div className="text-sm text-slate-800 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full text-xs uppercase">
                  {selectedGateway}
                </span>
                <span className="text-xs text-slate-500">
                  ({GATEWAYS.find((g) => g.id === selectedGateway)?.description || 'Popular Indian payment gateway'})
                </span>
              </div>
            </div>

            {/* Options Row (Include GST, Discount, Expiration) */}
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={includeGST}
                  onChange={(e) => setIncludeGST(e.target.checked)}
                  className="accent-blue-600 w-4 h-4 cursor-pointer"
                />
                <span>Include GST (18%)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span>Discount (₹):</span>
                <input
                  type="text"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span>Expiration (hours):</span>
                <input
                  type="number"
                  min="0.25"
                  max="100"
                  step="0.25"
                  value={expireInHours}
                  onChange={(e) => {
                    const value = e.target.value
                    const num = Number(value)
                    if (value === '' || (!isNaN(num) && num >= 0.25 && num <= 100)) {
                      setExpireInHours(value === '' ? 1 : num)
                    }
                  }}
                  className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </label>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Breakdown Box */}
            <div className="mb-5 bg-slate-100 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Base Amount:</span>
                <span>₹{baseAmount.toLocaleString('en-IN')}</span>
              </div>
              {includeGST && (
                <div className="flex justify-between text-slate-700">
                  <span>GST (18%):</span>
                  <span>₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>- ₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-slate-300 pt-2 text-slate-900">
                <span>Total Amount:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setStep('select_gateway')
                  setError(null)
                }}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleGenerateLink()}
                disabled={totalAmount < 1 || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold px-5 py-2 transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Generating...' : 'Generate Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: LINK GENERATED SUCCESS ================= */}
        {step === 'success' && generatedUrl && (
          <div className="p-6 space-y-4">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">Payment Link Generated!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Amount: <strong className="font-semibold">₹{totalAmount.toLocaleString('en-IN')}</strong> • Valid for {expireInHours} hours
              </p>
            </div>

            <p className="text-xs text-slate-500">Share this link directly with the customer:</p>

            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                className="flex-1 bg-transparent text-xs text-slate-700 font-mono outline-none px-2 select-all"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={generatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
