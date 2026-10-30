import React from 'react'
import { CustomerPaymentView } from '../components/CustomerPaymentView'

export function CustomerPaymentPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      <nav className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
        <span>MBG Card</span>
        <span>&rsaquo;</span>
        <span>Sales & Billing</span>
        <span>&rsaquo;</span>
        <span className="text-slate-600 font-medium">Customer Payments</span>
      </nav>
      <CustomerPaymentView />
    </div>
  )
}

export default CustomerPaymentPage

