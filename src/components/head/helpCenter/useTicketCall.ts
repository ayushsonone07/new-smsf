import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { initiateAirtelClickToCall } from '../../../api/airtel.api'

export interface TicketCallTarget {
  ticketNumber: string
  customerPhone?: string | null
  /** SMSB customers.id (ticket.smsbCustomerId) — optional, SMSB also matches by phone */
  customerId?: number | null
  customerName?: string | null
  departmentType?: string | null
}

/**
 * Click-to-call from a ticket. The call is tagged contextType=TICKET + ticketNumber,
 * so its recording appears in this ticket's Calls View (not in the department tab).
 *
 * `call()` uses the target passed to the hook; `call(other)` calls a different
 * ticket (e.g. the 📞 icon on a table row).
 */
export function useTicketCall(target: TicketCallTarget) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const mutation = useMutation({
    mutationFn: async (override?: TicketCallTarget) => {
      const t = override ?? target
      if (!t.customerPhone) throw new Error('Customer has no phone number on record.')
      const result = await initiateAirtelClickToCall(t.customerPhone, {
        contextType: 'TICKET',
        ticketNumber: t.ticketNumber,
        customerId: t.customerId ?? undefined,
        customerName: t.customerName ?? undefined,
        departmentType: t.departmentType ?? undefined,
      })
      if (result?.success === false) throw new Error(result.message || 'Unable to initiate call')
      return result
    },
    onSuccess: () => {
      setMessage({
        type: 'success',
        text: 'Call started — your phone will ring first. The recording appears in Calls View after the call.',
      })
      queryClient.invalidateQueries({ queryKey: ['calls-history'] })
      queryClient.invalidateQueries({ queryKey: ['help-center-calls'] })
    },
    onError: (err: unknown) => {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unable to initiate call' })
    },
  })

  return {
    call: (override?: TicketCallTarget) => {
      setMessage(null)
      mutation.mutate(override)
    },
    isCalling: mutation.isPending,
    /** Ticket number of the call being started, if any */
    callingTicket: mutation.isPending ? (mutation.variables ?? target).ticketNumber : null,
    message,
    clearMessage: () => setMessage(null),
  }
}
