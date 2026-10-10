export type ServiceTaskStatus = 'Completed' | 'In progress' | 'Pending'
export type TicketStatus = 'Pending' | 'Completed' | 'In progress'
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent'

export interface ServiceTask {
  id: string
  name: string
  status: ServiceTaskStatus
}

export interface CustomerServiceItem {
  id: string
  categoryName: string
  dotColor?: 'blue' | 'green' | 'purple' | 'amber'
  status: 'In progress' | 'Completed' | 'Pending'
  completedCount: number
  totalCount: number
  tasks: ServiceTask[]
}

export interface ExecutiveInfo {
  name: string
  roleTitle: string
  initial: string
  phone?: string
  whatsapp?: string
}

export interface CustomerProfile {
  id: string
  clientName: string
  companyName: string
  status: 'Pending' | 'Active' | 'Completed'
  packageName: string
  packageDuration: string
  onboardingStepText: string
  onboardingProgressPercent: number
  executive: ExecutiveInfo
}

export interface UpcomingMeeting {
  id: string
  dateMonth: string
  dateDay: string
  title: string
  dateTimeText: string
  executiveText: string
}

export interface RecentUpdate {
  id: string
  title: string
  category: string
  timestamp?: string
  iconType: 'help' | 'check' | 'pulse'
}

export interface SupportTicket {
  id: string
  ticketNumber: string
  status: TicketStatus
  priority: TicketPriority
  timestamp: string
  title: string
  message: string
  senderName: string
}

export interface CreateTicketInput {
  subject: string
  serviceCategory: string
  priority: TicketPriority
  description: string
}

export interface CustomerDashboardData {
  profile: CustomerProfile
  meeting: UpcomingMeeting
  services: CustomerServiceItem[]
  updates: RecentUpdate[]
  tickets: SupportTicket[]
}
