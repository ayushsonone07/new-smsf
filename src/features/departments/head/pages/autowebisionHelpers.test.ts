import { describe, it, expect } from 'vitest'
import {
  getWebsiteServiceStatus,
  getAutomationServiceStatus,
  getSubServicesForCustomer,
  checkSubServicesCompletion,
  getServicePillStatus,
  getServicePillStyle,
  getStatusBadgeStyle,
  getStatusSelectStyle,
  getStatusIconColor,
  formatStatusLabel,
} from './autowebisionHelpers'
import type { AutowebsionCustomerLightDTO } from '../../../../api/autowebsion.api'

describe('autowebisionHelpers', () => {
  describe('getServicePillStatus - SOP & Sub-service status rules', () => {
    it('returns COMPLETED only when 100% of all SOP sub-services are completed', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 1,
        services: [
          {
            serviceType: 'WEBSITE_DEVELOPMENT',
            subServiceInfo: [
              { name: 'Wireframe Design', status: 'COMPLETED' },
              { name: 'Content Integration', status: 'COMPLETED' },
              { name: 'Testing & Launch', status: 'COMPLETED' },
            ],
          },
        ],
      }

      const status = getServicePillStatus(customer, 'WEBSITE')
      expect(status).toBe('COMPLETED')

      const pillStyle = getServicePillStyle(status)
      expect(pillStyle.btnClass).toContain('cl-service-pill--completed')
      expect(pillStyle.label).toBe('Completed')
      expect(pillStyle.inlineStyle.color).toBe('#15803d') // Green
      expect(pillStyle.inlineStyle.backgroundColor).toBe('#f0fdf4')
    })

    it('does NOT show COMPLETED when some SOPs are completed and one is waiting customer acknowledgement', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 2,
        services: [
          {
            serviceType: 'WEBSITE_DEVELOPMENT',
            subServiceInfo: [
              { name: 'Wireframe Design', status: 'COMPLETED' },
              { name: 'Draft Delivery', status: 'PENDING_CUSTOMER_ACK' },
            ],
          },
        ],
      }

      const status = getServicePillStatus(customer, 'WEBSITE')
      expect(status).not.toBe('COMPLETED')
      expect(status).toBe('WAITING_ACK')

      const pillStyle = getServicePillStyle(status)
      expect(pillStyle.btnClass).toContain('cl-service-pill--waiting-ack')
      expect(pillStyle.label).toBe('Waiting Customer Acknowledgment')
      expect(pillStyle.inlineStyle.color).toBe('#7e22ce') // Purple
      expect(pillStyle.inlineStyle.backgroundColor).toBe('#faf5ff')
    })

    it('does NOT show COMPLETED when SOPs are in progress or partially completed', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 3,
        services: [
          {
            serviceType: 'AUTOMATION_SETUP',
            subServiceInfo: [
              { name: 'Bot Setup', status: 'IN_PROGRESS' },
              { name: 'Webhook Configuration', status: 'PENDING' },
            ],
          },
        ],
      }

      const status = getServicePillStatus(customer, 'AUTOMATION')
      expect(status).not.toBe('COMPLETED')
      expect(status).toBe('IN_PROGRESS')

      const pillStyle = getServicePillStyle(status)
      expect(pillStyle.btnClass).toContain('cl-service-pill--in-progress')
      expect(pillStyle.label).toBe('In Progress')
      expect(pillStyle.inlineStyle.color).toBe('#1d4ed8') // Blue
      expect(pillStyle.inlineStyle.backgroundColor).toBe('#eff6ff')
    })

    it('shows PENDING when all SOP sub-services are pending', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 4,
        services: [
          {
            serviceType: 'WEBSITE_DEVELOPMENT',
            subServiceInfo: [
              { name: 'Requirements', status: 'PENDING' },
              { name: 'Design', status: 'PENDING' },
            ],
          },
        ],
      }

      const status = getServicePillStatus(customer, 'WEBSITE')
      expect(status).toBe('PENDING')

      const pillStyle = getServicePillStyle(status)
      expect(pillStyle.btnClass).toContain('cl-service-pill--pending')
      expect(pillStyle.label).toBe('Pending')
      expect(pillStyle.inlineStyle.color).toBe('#b45309') // Amber
      expect(pillStyle.inlineStyle.backgroundColor).toBe('#fff8eb')
    })

    it('extracts SOP sub-services correctly from customer.subServiceInfo array and filters by service type', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 5,
        subServiceInfo: [
          { name: 'Website Design Mockup', status: 'COMPLETED' },
          { name: 'Website SEO Audit', status: 'PENDING_CUSTOMER_ACK' },
          { name: 'Automation WhatsApp Bot', status: 'IN_PROGRESS' },
        ],
      }

      const webStatus = getServicePillStatus(customer, 'WEBSITE')
      expect(webStatus).toBe('WAITING_ACK') // Website has 1 completed, 1 pending ack

      const autoStatus = getServicePillStatus(customer, 'AUTOMATION')
      expect(autoStatus).toBe('IN_PROGRESS') // Automation has WhatsApp Bot in progress
    })

    it('handles alternative property names like subServiceName and subServiceStatus', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 6,
        services: [
          {
            serviceType: 'WEBSITE',
            subServices: [
              { subServiceName: 'Domain Setup', subServiceStatus: 'COMPLETED' },
              { subServiceName: 'Hosting Config', subServiceStatus: 'COMPLETED' },
            ],
          },
        ],
      }

      const status = getServicePillStatus(customer, 'WEBSITE')
      expect(status).toBe('COMPLETED')
    })

    it('falls back safely to service row status when customer has no SOP sub-services', () => {
      const customerWithCompletedService: AutowebsionCustomerLightDTO = {
        customerId: 7,
        services: [
          {
            serviceType: 'AUTOMATION',
            status: 'COMPLETED',
          },
        ],
      }

      expect(getServicePillStatus(customerWithCompletedService, 'AUTOMATION')).toBe('COMPLETED')

      const customerWithPendingService: AutowebsionCustomerLightDTO = {
        customerId: 8,
        services: [
          {
            serviceType: 'AUTOMATION',
            status: 'PENDING',
          },
        ],
      }

      expect(getServicePillStatus(customerWithPendingService, 'AUTOMATION')).toBe('PENDING')
    })
  })

  describe('checkSubServicesCompletion', () => {
    it('detects when sub-services are 100% complete', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 10,
        services: [
          {
            serviceType: 'WEBSITE',
            subServiceInfo: [
              { name: 'Design', status: 'COMPLETED' },
              { name: 'Development', status: 'COMPLETED' },
            ],
          },
        ],
      }

      const result = checkSubServicesCompletion(customer, 'WEBSITE')
      expect(result.allCompleted).toBe(true)
      expect(result.isWaitingAck).toBe(false)
      expect(result.incompleteNames).toHaveLength(0)
    })

    it('detects when incomplete sub-services are awaiting customer acknowledgment', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 11,
        services: [
          {
            serviceType: 'WEBSITE',
            subServiceInfo: [
              { name: 'Design', status: 'COMPLETED' },
              { name: 'Customer Review', status: 'PENDING_CUSTOMER_ACK' },
            ],
          },
        ],
      }

      const result = checkSubServicesCompletion(customer, 'WEBSITE')
      expect(result.allCompleted).toBe(false)
      expect(result.isWaitingAck).toBe(true)
      expect(result.incompleteNames).toEqual(['Customer Review'])
    })

    it('returns empty list and allCompleted: true when customer has no sub-services', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 12,
      }

      const result = checkSubServicesCompletion(customer, 'WEBSITE')
      expect(result.allCompleted).toBe(true)
      expect(result.subServices).toHaveLength(0)
    })
  })

  describe('Multi-service Website status calculation (getWebsiteServiceStatus)', () => {
    it('returns COMPLETED only if both/all website services are completed', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 20,
        services: [
          { serviceType: 'WEBSITE_DEV', status: 'COMPLETED' },
          { serviceType: 'WEBSITE_MAINTENANCE', status: 'COMPLETED' },
        ],
      }

      expect(getWebsiteServiceStatus(customer)).toBe('COMPLETED')
    })

    it('returns IN_PROGRESS if one website service is completed and another is pending', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 21,
        services: [
          { serviceType: 'WEBSITE_DEV', status: 'COMPLETED' },
          { serviceType: 'WEBSITE_MAINTENANCE', status: 'PENDING' },
        ],
      }

      expect(getWebsiteServiceStatus(customer)).toBe('IN_PROGRESS')
    })

    it('returns PENDING if all website services are pending', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 22,
        services: [
          { serviceType: 'WEBSITE_DEV', status: 'PENDING' },
          { serviceType: 'WEBSITE_MAINTENANCE', status: 'PENDING' },
        ],
      }

      expect(getWebsiteServiceStatus(customer)).toBe('PENDING')
    })

    it('returns PENDING and does not default to COMPLETED when websiteServices are absent, even if mainStatus is COMPLETED', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 23,
        mainStatus: 'COMPLETED',
        services: [],
      }

      expect(getWebsiteServiceStatus(customer)).toBe('PENDING')
      expect(getServicePillStatus(customer, 'WEBSITE')).toBe('PENDING')
    })
  })

  describe('Automation status calculation (getAutomationServiceStatus)', () => {
    it('returns COMPLETED when automation service is completed', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 30,
        services: [{ serviceType: 'AUTOMATION_BOT', status: 'COMPLETED' }],
      }

      expect(getAutomationServiceStatus(customer)).toBe('COMPLETED')
    })

    it('returns IN_PROGRESS when automation service is in progress', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 31,
        services: [{ serviceType: 'AUTOMATION_BOT', status: 'IN_PROGRESS' }],
      }

      expect(getAutomationServiceStatus(customer)).toBe('IN_PROGRESS')
    })

    it('returns PENDING and does not default to COMPLETED when automationServices are absent, even if mainStatus is COMPLETED', () => {
      const customer: AutowebsionCustomerLightDTO = {
        customerId: 32,
        mainStatus: 'COMPLETED',
        services: [],
      }

      expect(getAutomationServiceStatus(customer)).toBe('PENDING')
      expect(getServicePillStatus(customer, 'AUTOMATION')).toBe('PENDING')
    })
  })

  describe('Status styles and formatting helpers', () => {
    it('returns correct CSS classes for badge and select styles', () => {
      expect(getStatusBadgeStyle('COMPLETED')).toContain('bg-emerald-50')
      expect(getStatusBadgeStyle('IN_PROGRESS')).toContain('bg-blue-50')
      expect(getStatusBadgeStyle('PENDING')).toContain('bg-[#fff8eb]')

      expect(getStatusSelectStyle('COMPLETED')).toContain('border-emerald-300')
      expect(getStatusSelectStyle('IN_PROGRESS')).toContain('border-blue-300')
      expect(getStatusSelectStyle('PENDING')).toContain('border-amber-300')

      expect(getStatusIconColor('COMPLETED')).toBe('text-emerald-600')
      expect(getStatusIconColor('IN_PROGRESS')).toBe('text-blue-600')
      expect(getStatusIconColor('PENDING')).toBe('text-amber-700')

      expect(formatStatusLabel('COMPLETED')).toBe('Completed')
      expect(formatStatusLabel('IN_PROGRESS')).toBe('In Progress')
      expect(formatStatusLabel('PENDING')).toBe('Pending')
    })
  })
})

