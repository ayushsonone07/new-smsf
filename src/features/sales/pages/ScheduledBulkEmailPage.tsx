import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, LockKeyhole, Mail, Plus, Send, Trash2, Upload } from 'lucide-react'
import { ApiError } from '../../../api/client'
import { PageLayout } from '../../../components/layout/PageLayout'
import {
  createScheduledBulkEmail,
  requestScheduledBulkEmailOtp,
  verifyScheduledBulkEmailOtp,
  type ScheduledBulkEmailJob,
} from '../../../api/scheduled-bulk-email.api'

function defaultScheduleAt() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:00`
}

export function ScheduledBulkEmailPage() {
  const [subject, setSubject] = useState('')
  const [textBody, setTextBody] = useState('')
  const [excel, setExcel] = useState<File | null>(null)
  const [template, setTemplate] = useState<File | null>(null)
  const [scheduleAt, setScheduleAt] = useState<string[]>([defaultScheduleAt()])
  const [unlockToken, setUnlockToken] = useState('')
  const [otp, setOtp] = useState('')
  const [otpDialogOpen, setOtpDialogOpen] = useState(false)
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    message: string
    schedules: ScheduledBulkEmailJob[]
    recipientsCount: number
    skippedInvalidCount: number
    skippedDuplicateCount: number
  } | null>(null)

  useEffect(() => {
    if (!unlockToken) return
    const timeout = window.setTimeout(() => {
      setUnlockToken('')
      setError('Your bulk email unlock expired. Verify a new code to continue.')
    }, 30 * 60 * 1000)
    return () => window.clearTimeout(timeout)
  }, [unlockToken])

  function updateSchedule(index: number, value: string) {
    setScheduleAt((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  function addSchedule() {
    setScheduleAt((current) => [...current, ''])
  }

  function removeSchedule(index: number) {
    setScheduleAt((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function beginUnlock() {
    setError('')
    setIsRequestingOtp(true)
    try {
      await requestScheduledBulkEmailOtp()
      setOtp('')
      setOtpDialogOpen(true)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the verification code.')
    } finally {
      setIsRequestingOtp(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult(null)
    if (!unlockToken) {
      setError('Unlock scheduled bulk email with email verification before sending.')
      return
    }
    if (!excel || !template) {
      setError('Select both the recipient Excel file and the HTML template.')
      return
    }
    const schedules = scheduleAt.map((value) => value.trim()).filter(Boolean)
    if (schedules.length === 0) {
      setError('Add at least one schedule date and time.')
      return
    }

    const formData = new FormData()
    formData.append('excel', excel)
    formData.append('template', template)
    formData.append('subject', subject)
    if (textBody.trim()) formData.append('textBody', textBody)
    schedules.forEach((value) => formData.append('scheduleAt', value))

    setIsSending(true)
    try {
      const response = await createScheduledBulkEmail(formData, unlockToken)
      setResult({
        message: response.message,
        schedules: response.data.schedules,
        recipientsCount: response.data.recipientsCount,
        skippedInvalidCount: response.data.skippedInvalidCount,
        skippedDuplicateCount: response.data.skippedDuplicateCount,
      })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setUnlockToken('')
        setError('Your bulk email unlock expired. Verify a new code to continue.')
        return
      }
      setError(requestError instanceof Error ? requestError.message : 'Unable to schedule the bulk email.')
    } finally {
      setIsSending(false)
    }
  }

  async function verifyCode() {
    setError('')
    setIsVerifyingOtp(true)
    try {
      const response = await verifyScheduledBulkEmailOtp(otp.trim())
      setUnlockToken(response.data.unlockToken)
      setOtpDialogOpen(false)
      setOtp('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify the code.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="relative">
          <div className={unlockToken ? '' : 'pointer-events-none select-none blur-sm'}>
        <header className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <Mail size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scheduled bulk email</h1>
            <p className="mt-1 text-sm text-slate-600">
              Upload recipients and a template to schedule one email campaign per date.
            </p>
          </div>
          {unlockToken && (
            <button
              type="button"
              onClick={() => {
                setUnlockToken('')
                setResult(null)
                setError('')
              }}
              className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Lock page
            </button>
          )}
        </header>

        <form onSubmit={submit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium text-slate-800">
              Email subject
              <input
                required
                maxLength={255}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Your email subject"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-800">
              Recipient Excel file
              <span className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                <Upload size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  required
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => setExcel(event.target.files?.[0] ?? null)}
                  className="min-w-0 w-full text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-medium file:text-blue-700"
                />
              </span>
              <span className="block text-xs font-normal text-slate-500">
                First worksheet must have an email column. Other columns are available as template placeholders.
              </span>
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-800 md:col-span-2">
              HTML email template
              <span className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                <Upload size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  required
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={(event) => setTemplate(event.target.files?.[0] ?? null)}
                  className="min-w-0 w-full text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-medium file:text-blue-700"
                />
              </span>
              <span className="block text-xs font-normal text-slate-500">
                Use placeholders matching Excel headers, such as {'{{First Name}}'}; {'{{email}}'} is always available.
              </span>
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-800 md:col-span-2">
              Plain-text body <span className="font-normal text-slate-500">(optional)</span>
              <textarea
                rows={4}
                value={textBody}
                onChange={(event) => setTextBody(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Optional text version. You can use the same Excel placeholders."
              />
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Schedule dates and times</h2>
                <p className="text-xs text-slate-500">Times are interpreted in Asia/Kolkata.</p>
              </div>
              <button
                type="button"
                onClick={addSchedule}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                <Plus size={16} aria-hidden="true" /> Add date
              </button>
            </div>
            {scheduleAt.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <CalendarClock size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  required
                  type="datetime-local"
                  value={value}
                  onChange={(event) => updateSchedule(index, event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {scheduleAt.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove schedule ${index + 1}`}
                    onClick={() => removeSchedule(index)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </section>

          {result && (
            <section role="status" className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-semibold">{result.message}</p>
              <p>
                {result.recipientsCount} valid recipient(s); {result.skippedInvalidCount} invalid and{' '}
                {result.skippedDuplicateCount} duplicate row(s) skipped.
              </p>
              <ul className="list-inside list-disc">
                {result.schedules.map((schedule) => (
                  <li key={schedule.id}>
                    {schedule.scheduledAt} — {schedule.status} (ID: {schedule.id})
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            {error && (
              <p role="alert" className="mr-auto self-center rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} aria-hidden="true" />
              {isSending ? 'Scheduling…' : 'Send Bulk Email'}
            </button>
          </div>
        </form>

          </div>

          {!unlockToken && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-900/20 p-5">
              <section className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                <LockKeyhole className="mx-auto text-blue-700" size={32} aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Bulk email is locked</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Verify the one-time code sent to raj@mbgcard.com to use this feature.
                  </p>
                </div>
                {error && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isRequestingOtp}
                  onClick={() => void beginUnlock()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LockKeyhole size={17} aria-hidden="true" />
                  {isRequestingOtp ? 'Sending code…' : 'Unlock'}
                </button>
              </section>
            </div>
          )}
        </div>

        {otpDialogOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isVerifyingOtp) {
                setOtpDialogOpen(false)
                setOtp('')
                setError('')
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-email-otp-title"
              className="w-full max-w-md space-y-5 rounded-xl bg-white p-6 shadow-2xl"
            >
              <div>
                <h2 id="bulk-email-otp-title" className="text-lg font-bold text-slate-900">
                  Verify your email
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  A 6-digit code was sent to raj@mbgcard.com. It expires in 10 minutes.
                </p>
              </div>
              <label className="block space-y-2 text-sm font-medium text-slate-800">
                Verification code
                <input
                  autoFocus
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void verifyCode()
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter 6-digit code"
                />
              </label>
              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isVerifyingOtp}
                  onClick={() => {
                    setOtpDialogOpen(false)
                    setOtp('')
                    setError('')
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVerifyingOtp || otp.length !== 6}
                  onClick={() => void verifyCode()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LockKeyhole size={16} aria-hidden="true" />
                  {isVerifyingOtp ? 'Verifying…' : 'Verify and unlock'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
