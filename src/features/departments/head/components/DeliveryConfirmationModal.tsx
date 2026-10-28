import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import {
  updateDeliveryConfirmation,
  type DeliveryConfirmationData,
  type DeliveryConfirmationResult,
} from '../../../../api/department-users.api'
import {
  Package,
  FileText,
  MapPin,
  QrCode,
  LayoutDashboard,
  FilePlus,
  Video,
  Globe,
  Zap,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react'
import './DeliveryConfirmationModal.css'

export const EMPTY_DELIVERY_FORM: DeliveryConfirmationData = {
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

interface Props {
  open: boolean
  customerId: number | string
  customerName: string
  initialData?: Partial<DeliveryConfirmationData> | null
  readOnly?: boolean
  onClose: () => void
  onSuccess?: (result: DeliveryConfirmationResult) => void | Promise<void>
}

export function DeliveryConfirmationModal({
  open,
  customerId,
  customerName,
  initialData,
  readOnly = false,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<DeliveryConfirmationData>(EMPTY_DELIVERY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY_DELIVERY_FORM,
      ...(initialData || {}),
    })
    setError(null)
  }, [open, initialData])

  function handleChange(field: keyof DeliveryConfirmationData, value: string) {
    if (readOnly) return
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (readOnly) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await updateDeliveryConfirmation(customerId, form)
      if (onSuccess) {
        await onSuccess(result)
      }
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
      onClose={() => {
        if (!saving) onClose()
      }}
      size="md"
      closeOnEscape={!saving}
      className="delivery-conf-modal"
    >
      <div className="delivery-conf-container">
        {/* Header */}
        <div className="delivery-conf-header">
          <div className="delivery-conf-header-title">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2>Delivery Confirmation</h2>
          </div>
          <p className="delivery-conf-header-sub">
            Complete delivery details for <strong>{customerName}</strong>
          </p>
        </div>

        {/* Read-Only Notice for Department Head */}
        {readOnly && (
          <div className="delivery-conf-readonly-alert">
            <Eye className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Read-Only View:</strong> As a department head, you can view the saved delivery details.
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="delivery-conf-error-alert" role="alert">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Fields list matching screenshot */}
        <div className="delivery-conf-body">
          {/* 1. Invoice */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Invoice</span>
            </label>
            <input
              type="text"
              placeholder="Enter invoice details"
              value={form.invoice}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('invoice', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 2. Google Business Profile Link */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>Google Business Profile Link</span>
            </label>
            <input
              type="text"
              placeholder="Enter Google Business Profile link"
              value={form.profileLink}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('profileLink', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 3. Positive Review QR (Nested Card Container) */}
          <div className="delivery-conf-qr-card">
            <div className="delivery-conf-qr-title">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Positive Review QR</span>
            </div>

            <div className="delivery-conf-subfield">
              <label className="delivery-conf-sublabel">Login (Review us link)</label>
              <input
                type="text"
                placeholder="Enter review us link"
                value={form.positiveReviewQr}
                disabled={readOnly || saving}
                onChange={(e) => handleChange('positiveReviewQr', e.target.value)}
                className="delivery-conf-input"
              />
            </div>

            <div className="delivery-conf-qr-grid">
              <div className="delivery-conf-subfield">
                <label className="delivery-conf-sublabel">Username (Review us login number)</label>
                <input
                  type="text"
                  placeholder="Review us login number"
                  value={form.positiveReviewQrUsername}
                  disabled={readOnly || saving}
                  onChange={(e) => handleChange('positiveReviewQrUsername', e.target.value)}
                  className="delivery-conf-input"
                />
              </div>

              <div className="delivery-conf-subfield">
                <label className="delivery-conf-sublabel">Password</label>
                <input
                  type="text"
                  placeholder="Password"
                  value={form.positiveReviewQrPassword}
                  disabled={readOnly || saving}
                  onChange={(e) => handleChange('positiveReviewQrPassword', e.target.value)}
                  className="delivery-conf-input"
                />
                <span className="delivery-conf-hint">Defaults to the standard value (123).</span>
              </div>
            </div>
          </div>

          {/* 4. Google Performance Dashboard */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>Google Performance Dashboard</span>
            </label>
            <input
              type="text"
              placeholder="Enter Google Performance Dashboard URL"
              value={form.googlePerformanceDashboard}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('googlePerformanceDashboard', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 5. 365 Creative Bundle */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <FilePlus className="w-4 h-4 text-orange-500" />
              <span>365 Creative Bundle</span>
            </label>
            <input
              type="text"
              placeholder="Enter 365 Creative Bundle details"
              value={form.creativeBundle}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('creativeBundle', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 6. AI Video */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <Video className="w-4 h-4 text-purple-500" />
              <span>AI Video</span>
            </label>
            <input
              type="text"
              placeholder="Enter AI Video link"
              value={form.aiVideo}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('aiVideo', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 7. Website */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <Globe className="w-4 h-4 text-cyan-600" />
              <span>Website</span>
            </label>
            <input
              type="text"
              placeholder="Enter website URL or details"
              value={form.website}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('website', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 8. Automation Dashboard */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Automation Dashboard</span>
            </label>
            <input
              type="text"
              placeholder="Enter Automation Dashboard URL"
              value={form.automationDashboard}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('automationDashboard', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 9. Automation Login ID */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Automation Login ID</span>
            </label>
            <input
              type="text"
              placeholder="Enter Automation Login ID"
              value={form.automationLoginId}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('automationLoginId', e.target.value)}
              className="delivery-conf-input"
            />
          </div>

          {/* 10. Monthly Blog Promotion */}
          <div className="delivery-conf-field">
            <label className="delivery-conf-label">
              <FileText className="w-4 h-4 text-rose-500" />
              <span>Monthly Blog Promotion</span>
            </label>
            <input
              type="text"
              placeholder="Enter Monthly Blog Promotion details"
              value={form.monthlyBlogPromotion}
              disabled={readOnly || saving}
              onChange={(e) => handleChange('monthlyBlogPromotion', e.target.value)}
              className="delivery-conf-input"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="delivery-conf-footer">
          <button
            type="button"
            className="delivery-conf-btn-cancel"
            disabled={saving}
            onClick={onClose}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="button"
              className="delivery-conf-btn-submit"
              disabled={saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Submit'
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
