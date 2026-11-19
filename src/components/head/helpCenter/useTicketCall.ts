import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { initiateAirtelClickToCall } from '../../../api/airtel.api'

interface TicketCallTarget {
  ticketNumber: string
  customerPhone?: string | null
  /** SMSB customers.id (ticket.smsbCustomerId) — optional, SMSB also matches by phone */
  customerId?: number | null
  customerName?: string | null
  departmentType?: string | null
}

/**
 * Click-to-call from a ticket. The call is tagged contextType=TICKET + ticketNumber,
 * so its recording appears in this ticket's Calls section (not in the department tab).
 */
export function useTicketCall(target: TicketCallTarget) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target.customerPhone) throw new Error('Customer has no phone number on record.')
      const result = await initiateAirtelClickToCall(target.customerPhone, {
        contextType: 'TICKET',
        ticketNumber: target.ticketNumber,
        customerId: target.customerId ?? undefined,
        customerName: target.customerName ?? undefined,
        departmentType: target.departmentType ?? undefined,
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
    },
    onError: (err: unknown) => {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unable to initiate call' })
    },
  })

  return {
    call: () => {
      setMessage(null)
      mutation.mutate()
    },
    isCalling: mutation.isPending,
    message,
    clearMessage: () => setMessage(null),
  }
}
