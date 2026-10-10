import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CustomerDashboardLayout } from './CustomerDashboardLayout'
import { Icon } from '../head/shared/Icon'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'

export interface OfferItem {
  id: string
  offerType: string
  discountValue: string
  description: string
}

export function CustomerDetailsPage() {
  const navigate = useNavigate()
  const { session } = useCustomerSession()

  // Active step state: 1: Basic Info, 2: Billing, 3: Website, 4: Google, 5: Automation, 6: Done
  const [activeStep, setActiveStep] = useState<number>(4) // Default to Google step for previewing

  // Step 2: Billing Form State
  const [billingAddress, setBillingAddress] = useState(
    'N/A, MIC Institute Narmadapuram 461001',
  )
  const [noGstNumber, setNoGstNumber] = useState(false)
  const [gstNumber, setGstNumber] = useState('')

  // Step 1 & 3: Website & Basic Info State
  const [domainStatus, setDomainStatus] = useState('')
  const [domainName, setDomainName] = useState('')
  const [logoOption, setLogoOption] = useState('')
  const [imageOption, setImageOption] = useState('')
  const [businessName, setBusinessName] = useState('MICU Group')
  const [bookingLink, setBookingLink] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [businessTagline, setBusinessTagline] = useState(
    'Best IT Services in Navi Mumbai, Maharashtra',
  )
  const [email, setEmail] = useState(session?.email ?? 'hemantdubey.mic@gmail.com')
  const [servicesInput, setServicesInput] = useState('')
  const [mainServices, setMainServices] = useState<string[]>([])

  // Step 4: Google Step Specific Form State
  const [gmbProfileLink, setGmbProfileLink] = useState('')
  const [noGmbLink, setNoGmbLink] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [googleBusinessCategory, setGoogleBusinessCategory] = useState('')
  const [googleReviewLink, setGoogleReviewLink] = useState('')
  const [appointmentLink, setAppointmentLink] = useState('')

  // Step 5: Automation Step Specific Form State
  const [automationBusinessName, setAutomationBusinessName] = useState('MICU Group')
  const [automationCategory, setAutomationCategory] = useState('')
  const [mainGoal, setMainGoal] = useState('')
  const [offers, setOffers] = useState<OfferItem[]>([
    { id: 'off-1', offerType: '', discountValue: '', description: '' },
  ])
  const [area, setArea] = useState('')
  const [fullAddress, setFullAddress] = useState('N/A, MIC Institute Narmadapuram 461001')
  const [stateName, setStateName] = useState('')
  const [cityName, setCityName] = useState('')
  const [googleMapLink, setGoogleMapLink] = useState('')
  const [websiteLink, setWebsiteLink] = useState('')
  const [autoServicesInput, setAutoServicesInput] = useState('')
  const [autoServices, setAutoServices] = useState<string[]>([])
  const [aiChatbotEmail, setAiChatbotEmail] = useState('')
  const [aiChatbotLink, setAiChatbotLink] = useState('')

  // Compute profile progress % strictly by active step
  const progressPercent =
    activeStep === 1 ? 20 : activeStep === 2 ? 20 : activeStep === 3 ? 40 : activeStep === 4 ? 60 : activeStep === 5 ? 80 : 100

  function handleNextStep(e?: FormEvent) {
    if (e) e.preventDefault()
    if (activeStep < 6) {
      setActiveStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handlePrevStep() {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleAddService() {
    if (servicesInput.trim() && mainServices.length < 15) {
      setMainServices([...mainServices, servicesInput.trim()])
      setServicesInput('')
    }
  }

  function handleAddAutoService() {
    if (autoServicesInput.trim() && autoServices.length < 15) {
      setAutoServices([...autoServices, autoServicesInput.trim()])
      setAutoServicesInput('')
    }
  }

  function handleAddOffer() {
    setOffers([
      ...offers,
      { id: `off-${Date.now()}`, offerType: '', discountValue: '', description: '' },
    ])
  }

  function handleUpdateOffer(id: string, field: keyof OfferItem, value: string) {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    )
  }

  return (
    <CustomerDashboardLayout activeKey="my-details">
      <div className="cdb-body">
        {/* Breadcrumb line */}
        <div className="cdb-preview-bar">
          <span className="cdb-preview-icon">
            <Icon name="eye" size={16} />
          </span>
          <span>
            MBG Card &gt; <strong>Customer Dashboard</strong> — Your services, bills &amp; account at a glance
          </span>
        </div>

        {/* Main Details Card */}
        <div className="cdb-card" style={{ padding: '24px' }}>
          {/* Card Title & Progress Header */}
          <div className="cdb-card-header" style={{ marginBottom: '16px' }}>
            <div className="cdb-card-title-group">
              <div className="cdb-card-icon-box">
                <Icon name="userIn" size={18} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#2563eb',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  CUSTOMER DETAILS
                </span>
                <h2 className="cdb-card-title" style={{ fontSize: '20px' }}>
                  Complete your business profile
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  PROFILE
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{progressPercent}%</div>
              </div>
              <button
                type="button"
                className="cdb-btn-icon"
                style={{
                  border: 0,
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                }}
                title="Copy profile link"
              >
                <Icon name="copy" size={16} />
              </button>
            </div>
          </div>

          {/* Stepper Tabs Bar (Strict 5 Steps + Done) */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            {[
              { step: 1, label: 'Basic Info' },
              { step: 2, label: 'Billing' },
              { step: 3, label: 'Website' },
              { step: 4, label: 'Google' },
              { step: 5, label: 'Automation' },
              { step: 6, label: 'Done' },
            ].map((st) => {
              const isCurrent = activeStep === st.step
              const isDone = activeStep > st.step

              return (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => setActiveStep(st.step)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: isCurrent ? '0' : '1px solid #cbd5e1',
                    background: isCurrent ? '#2563eb' : isDone ? '#dcfce7' : '#ffffff',
                    color: isCurrent ? '#ffffff' : isDone ? '#16a34a' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDone ? <Icon name="check" size={14} strokeWidth={2.5} /> : null}
                  <span>{st.label}</span>
                </button>
              )
            })}
          </div>

          {/* STEP 1: Basic Info */}
          {activeStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Information related to website
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Optional — helps us build your site faster
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Domain Status
                  </label>
                  <select className="cdb-select" value={domainStatus} onChange={(e) => setDomainStatus(e.target.value)}>
                    <option value="">Select domain status...</option>
                    <option value="Already Have">Already Have Domain</option>
                    <option value="Need New">Need New Domain</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Domain Name
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. example.com"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Logo Options
                  </label>
                  <select className="cdb-select" value={logoOption} onChange={(e) => setLogoOption(e.target.value)}>
                    <option value="">Select logo options...</option>
                    <option value="Have Logo">Have Logo</option>
                    <option value="Need Logo Design">Need Logo Design</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Image Options
                  </label>
                  <select className="cdb-select" value={imageOption} onChange={(e) => setImageOption(e.target.value)}>
                    <option value="">Select image options...</option>
                    <option value="Have Images">Have Images</option>
                    <option value="Need Stock">Need Stock Images</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Business Name
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. CV Sales & Marketing"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Booking Link
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. https://..."
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Link
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. https://razorpay.me/.."
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Business Category
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. Restaurant, Clothing Store"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    Will display as: Best [category] in [area], [city] [state] India
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Business Tagline
                </label>
                <textarea
                  className="cdb-textarea"
                  rows={2}
                  placeholder="e.g. Best IT Services in Navi Mumbai, Maharashtra"
                  value={businessTagline}
                  onChange={(e) => setBusinessTagline(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Main Services / Products
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="List one at a time and click +"
                    value={servicesInput}
                    onChange={(e) => setServicesInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="cdb-btn-primary"
                    onClick={handleAddService}
                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Contact Details Section */}
              <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px', marginTop: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Contact Details</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Full Address
                  </label>
                  <input type="text" className="cdb-input" value="N/A, MIC Institute Narmadapuram 461001" readOnly />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input type="email" className="cdb-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 2: Billing */}
          {activeStep === 2 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #16a34a', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Billing Information</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Used for your invoices and GST</p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Billing Address *
                  </label>
                  <textarea
                    className="cdb-textarea"
                    rows={3}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    Max 1000 characters
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="checkbox"
                    id="noGst"
                    checked={noGstNumber}
                    onChange={(e) => setNoGstNumber(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="noGst" style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                    I don't have a GST Number
                  </label>
                </div>

                {!noGstNumber ? (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      GST Number
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="Enter 15 digit GST Number"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      maxLength={15}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      {gstNumber.length}/15 characters
                    </span>
                  </div>
                ) : null}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Screenshot (optional)
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: '#eff6ff',
                      borderRadius: '8px',
                      border: '1px dashed #bfdbfe',
                    }}
                  >
                    <Icon name="link" size={16} />
                    <button type="button" className="cdb-btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      Choose file
                    </button>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No file chosen</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    * Please fill Billing Address first to upload screenshot
                  </span>
                </div>
              </div>

              {/* Right Billing Graphic Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ background: '#16a34a', color: '#ffffff', padding: '10px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em' }}>
                    INVOICE
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                      GST Ready
                    </span>
                    <div style={{ width: '80%', height: '6px', background: '#f1f5f9', borderRadius: '4px' }} />
                    <div style={{ width: '60%', height: '6px', background: '#f1f5f9', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', border: '1px solid #16a34a', padding: '2px 8px', borderRadius: '50px', marginTop: '4px' }}>
                      PAID
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>BILLING STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 3: Website */}
          {activeStep === 3 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Information related to website</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Optional — helps us build your site faster</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Domain Status
                    </label>
                    <select className="cdb-select" value={domainStatus} onChange={(e) => setDomainStatus(e.target.value)}>
                      <option value="">Select domain status...</option>
                      <option value="Already Have">Already Have Domain</option>
                      <option value="Need New">Need New Domain</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Domain Name
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="e.g. example.com"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Website Graphic Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    background: '#2563eb',
                    borderRadius: '12px',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '16px',
                  }}
                >
                  <Icon name="grid" size={36} />
                  <span style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>yourdomain.com</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>WEBSITE STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 4: GOOGLE STEP (EXACT MATCH FOR SCREENSHOT 1) */}
          {activeStep === 4 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Google Information</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Your Google Business Profile details</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      GMB Profile Link
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="https://g.page/YourBusinessName"
                      value={gmbProfileLink}
                      onChange={(e) => setGmbProfileLink(e.target.value)}
                      disabled={noGmbLink}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="checkbox"
                        id="noGmbLink"
                        checked={noGmbLink}
                        onChange={(e) => setNoGmbLink(e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <label htmlFor="noGmbLink" style={{ fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                        Don't have link
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Brand Name
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="As per Google profile (e.g. CV Salon)"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Business Category *
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="Exact category. Area, Location, City, state"
                      value={googleBusinessCategory}
                      onChange={(e) => setGoogleBusinessCategory(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Google Review Link
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="https://g.page/r/..."
                      value={googleReviewLink}
                      onChange={(e) => setGoogleReviewLink(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Appointment Link
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="e.g. https://calendly.com/..."
                      value={appointmentLink}
                      onChange={(e) => setAppointmentLink(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Graphic Box: Google Business Graphic */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '210px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', height: '6px' }}>
                    <div style={{ flex: 1, background: '#4285F4' }} />
                    <div style={{ flex: 1, background: '#EA4335' }} />
                    <div style={{ flex: 1, background: '#FBBC05' }} />
                    <div style={{ flex: 1, background: '#34A853' }} />
                  </div>
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '100%', height: '70px', background: '#dcfce7', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                      <span style={{ fontSize: '18px', color: '#16a34a' }}>📍</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      ★★★★★ <span style={{ color: '#2563eb' }}>4.9 (218)</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff', background: '#2563eb', padding: '4px 12px', borderRadius: '999px' }}>
                      Google Business
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>GOOGLE STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 5: AUTOMATION STEP (EXACT MATCH FOR SCREENSHOTS 2, 3, 4) */}
          {activeStep === 5 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Automation Details</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Information related to WhatsApp Automation</p>
                </div>

                {/* 1. Business Name & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Business Name
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      value={automationBusinessName}
                      onChange={(e) => setAutomationBusinessName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Business Category
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="e.g. Restaurant, Clothing Store"
                      value={automationCategory}
                      onChange={(e) => setAutomationCategory(e.target.value)}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      Will display as: Best [category] in [area], [city] [state] India
                    </span>
                  </div>
                </div>

                {/* 2. Main Goal */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Main Goal
                  </label>
                  <select className="cdb-select" value={mainGoal} onChange={(e) => setMainGoal(e.target.value)}>
                    <option value="">Select main goal...</option>
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Sales">Sales & Marketing</option>
                  </select>
                </div>

                {/* 3. + Offers Configuration Panel */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>+ Offers Configuration</span>
                    <button
                      type="button"
                      className="cdb-btn-secondary"
                      onClick={handleAddOffer}
                      style={{ fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                    >
                      + Add Offer
                    </button>
                  </div>

                  {offers.map((off, idx) => (
                    <div key={off.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {offers.length > 1 ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Offer #{idx + 1}</span>
                      ) : null}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Offer Type</label>
                          <select className="cdb-select" value={off.offerType} onChange={(e) => handleUpdateOffer(off.id, 'offerType', e.target.value)}>
                            <option value="">Select offer type...</option>
                            <option value="Discount">Discount</option>
                            <option value="Free Trial">Free Trial</option>
                            <option value="Buy 1 Get 1">Buy 1 Get 1</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Discount / Value</label>
                          <input type="text" className="cdb-input" placeholder="e.g. 20% or Free" value={off.discountValue} onChange={(e) => handleUpdateOffer(off.id, 'discountValue', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Offer Description / Conditions</label>
                        <input type="text" className="cdb-input" placeholder="Describe the offer details..." value={off.description} onChange={(e) => handleUpdateOffer(off.id, 'description', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4. Location Details (Area, Address, State, City) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Area</label>
                    <input type="text" className="cdb-input" placeholder="Dhanwantri chowk, Deen Dayal, etc." value={area} onChange={(e) => setArea(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Full Address</label>
                    <input type="text" className="cdb-input" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>State</label>
                    <select className="cdb-select" value={stateName} onChange={(e) => setStateName(e.target.value)}>
                      <option value="">Select state...</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Delhi">Delhi</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>City</label>
                    <select className="cdb-select" value={cityName} onChange={(e) => setCityName(e.target.value)}>
                      <option value="">Select city...</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Bhopal">Bhopal</option>
                      <option value="Indore">Indore</option>
                    </select>
                  </div>
                </div>

                {/* 5. Google Map & Website Links */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Google Map Link</label>
                    <input type="text" className="cdb-input" placeholder="Google business profile link" value={googleMapLink} onChange={(e) => setGoogleMapLink(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Website Link</label>
                    <input type="text" className="cdb-input" placeholder="Website link (if already having)" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} />
                  </div>
                </div>

                {/* 6. Services / Products List */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Services / Products List</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="List one at a time and click +"
                      value={autoServicesInput}
                      onChange={(e) => setAutoServicesInput(e.target.value)}
                    />
                    <button type="button" className="cdb-btn-primary" onClick={handleAddAutoService} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>+</button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>Add one item at a time and click +</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Nothing added yet - {autoServices.length}/15</span>
                </div>

                {/* 7. Working Hours */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Working Hours (From ~ To)</label>
                    <button type="button" className="cdb-btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>+ Add</button>
                  </div>
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                    No working hours added.
                  </div>
                </div>

                {/* 8. AI Chatbot Configuration (Purple Card Box) */}
                <div style={{ background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center' }}>
                      <Icon name="flow" size={16} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#5b21b6' }}>AI Chatbot Configuration</h4>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#7c3aed' }}>Configure AI chatbot email and link for customer support</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#5b21b6', display: 'block', marginBottom: '4px' }}>AI Chatbot Email *</label>
                      <input type="email" className="cdb-input" placeholder="chatbot@company.com" value={aiChatbotEmail} onChange={(e) => setAiChatbotEmail(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#5b21b6', display: 'block', marginBottom: '4px' }}>AI Chatbot Link *</label>
                      <input type="text" className="cdb-input" placeholder="https://chatbot.company.com" value={aiChatbotLink} onChange={(e) => setAiChatbotLink(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Graphic Box: WhatsApp Graphic Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '130px',
                    height: '210px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '2px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ width: '30px', height: '4px', background: '#cbd5e1', borderRadius: '2px' }} />
                  <div style={{ width: '100%', padding: '6px', background: '#4f46e5', color: '#fff', borderRadius: '6px', fontSize: '9px', fontWeight: 700, textAlign: 'center' }}>
                    WhatsApp
                  </div>
                  <div style={{ width: '100%', height: '40px', background: '#f1f5f9', borderRadius: '6px' }} />
                  <div style={{ width: '100%', padding: '4px', background: '#7c3aed', color: '#fff', borderRadius: '4px', fontSize: '8px', fontWeight: 700, textAlign: 'center' }}>
                    Auto Reply
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>AUTOMATION STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 6: Done (Completed Page) */}
          {activeStep === 6 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                <Icon name="check" size={32} strokeWidth={3} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Onboarding Completed!</h2>
              <p style={{ fontSize: '13.5px', color: '#475569', maxWidth: '500px', margin: 0, textAlign: 'center' }}>
                Thank you for filling your information — your onboarding is successfully completed. Approve this onboarding via email too!
              </p>

              {/* Yellow Alert Box */}
              <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: '12px', padding: '16px 20px', width: '100%', maxWidth: '550px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="alert" size={16} /> Missing recommended information
                </span>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12.5px', color: '#78350f' }}>
                  <li>Brand Name</li>
                  <li>Business Category</li>
                  <li>Area</li>
                  <li>Google Review Link</li>
                </ul>
                <span style={{ fontSize: '11.5px', color: '#92400e', fontStyle: 'italic', marginTop: '4px' }}>
                  Note: providing these details later will help us serve you better.
                </span>
              </div>

              {/* Registered Contact box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: '#475569' }}>
                Registered contact details &mdash; <strong>Phone: 9827337896</strong> &nbsp;|&nbsp; <strong>Email: {email}</strong>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="cdb-btn-secondary" onClick={() => setActiveStep(1)}>
                  Fill the form again
                </button>
                <button type="button" className="cdb-btn-primary" onClick={() => navigate({ to: '/customers' })}>
                  Go to dashboard
                </button>
              </div>
            </div>
          ) : null}

          {/* Stepper Footer Controls (For Steps 1-5) */}
          {activeStep <= 5 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', marginTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                {activeStep > 1 ? (
                  <button type="button" className="cdb-btn-secondary" onClick={handlePrevStep}>
                    &larr; Back
                  </button>
                ) : (
                  <span />
                )}
              </div>

              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Step {activeStep} of 5
              </span>

              <button type="button" className="cdb-btn-primary" onClick={handleNextStep}>
                Save &amp; next &rarr;
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </CustomerDashboardLayout>
  )
}
