import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import {
  updateDeliveryConfirmation,
  type DeliveryConfirmationData,
} from '../../../../api/department-users.api'
import './DeliveryConfirmationModal.css'

const EMPTY_FORM: DeliveryConfirmationData = {
  invoice: '',
  positiveReviewQrUsername: '',
  positiveReviewQrPassword: '123',
  positiveReviewQr: '',
  googlePerformanceDashboard: '',
  creativeBundle: '',
  website: '',
  automationDashboard: '',
  automationLoginId: '',
  monthlyBlogPromotion: '',
  aiVideo: '',
  profileLink: '',
}

const FIELDS: Array<{
  key: keyof DeliveryConfirmationData
  label: string
  placeholder: string
}> = [
  { key: 'invoice', label: 'Invoice', placeholder: 'Enter invoice details' },
  { key: 'profileLink', label: 'Google Business Profile Link', placeholder: 'Enter Google Business Profile link' },
  { key: 'positiveReviewQr', label: 'Positive Review QR Login', placeholder: 'Enter review link' },
  { key: 'positiveReviewQrUsername', label: 'Positive Review QR Username', placeholder: 'Enter review login number' },
  { key: 'positiveReviewQrPassword', label: 'Positive Review QR Password', placeholder: 'Enter QR password' },
  { key: 'googlePerformanceDashboard', label: 'Google Performance Dashboard', placeholder: 'Enter dashboard URL' },
  { key: 'creativeBundle', label: '365 Creative Bundle', placeholder: 'Enter creative bundle details' },
  { key: 'aiVideo', label: 'AI Video', placeholder: 'Enter AI video link' },
  { key: 'website', label: 'Website', placeholder: 'Enter website URL' },
  { key: 'automationDashboard', label: 'Automation Dashboard', placeholder: 'Enter automation dashboard URL' },
  { key: 'automationLoginId', label: 'Automation Login ID', placeholder: 'Enter automation login ID' },
  { key: 'monthlyBlogPromotion', label: 'Monthly Blog Promotion', placeholder: 'Enter blog promotion details' },
]

interface Props {
  open: boolean
  customerId: number | string
  customerName: string
  initialData?: Partial<DeliveryConfirmationData> | null
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

export function DeliveryConfirmationModal({
  open,
  customerId,
  customerName,
  initialData,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<DeliveryConfirmationData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm({ ...EMPTY_FORM, ...initialData })
    setError(null)
  }, [open, initialData])

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      await updateDeliveryConfirmation(customerId, form)
      await onSuccess()
      onClose()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to update delivery confirmation',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose() }}
      title="Delivery Confirmation"
      description={`Complete delivery details for ${customerName}`}
      size="md"
      closeOnEscape={!saving}
      className="delivery-confirmation-modal"
    >
      <div className="delivery-confirmation-form">
        {error && <div className="delivery-confirmation-error" role="alert">{error}</div>}
        <div className="delivery-confirmation-fields">
          {FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                value={form[field.key]}
                placeholder={field.placeholder}
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="delivery-confirmation-actions">
          <button type="button" className="is-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="button" className="is-primary" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
