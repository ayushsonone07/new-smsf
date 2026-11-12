import React from 'react'
import { CustomerPaymentView } from '../components/CustomerPaymentView'

export function CustomerPaymentPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      <CustomerPaymentView />
    </div>
  )
}

export default CustomerPaymentPage

