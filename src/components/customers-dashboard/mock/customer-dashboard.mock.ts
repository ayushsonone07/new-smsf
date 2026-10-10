import type { CustomerDashboardData } from '../types/customer-dashboard.types'

export const MOCK_CUSTOMER_DASHBOARD_DATA: CustomerDashboardData = {
  profile: {
    id: 'cust-101',
    clientName: 'Satyam Tiwari',
    companyName: 'Lala Company',
    status: 'Pending',
    packageName: 'Digital Card + Website',
    packageDuration: '6 months',
    onboardingStepText: 'of your services delivered · 1 of 8 steps',
    onboardingProgressPercent: 13,
    executive: {
      name: 'Abhishek Sahu',
      roleTitle: 'Your onboarding executive',
      initial: 'A',
      phone: '+91 9403948576',
      whatsapp: '+91 9403948576',
    },
  },
  meeting: {
    id: 'meet-101',
    dateMonth: 'OCT',
    dateDay: '1',
    title: 'YOUR UPCOMING MEETING',
    dateTimeText: '1 Oct 2026, 11:00 am · Google Meet',
    executiveText: 'With Abhishek Sahu from MBG Card · Website theme demo',
  },
  services: [
    {
      id: 'srv-1',
      categoryName: 'Billing',
      dotColor: 'blue',
      status: 'In progress',
      completedCount: 1,
      totalCount: 2,
      tasks: [
        { id: 't-1', name: 'Invoice generated', status: 'Completed' },
        { id: 't-2', name: 'Payment confirmed', status: 'In progress' },
      ],
    },
    {
      id: 'srv-2',
      categoryName: 'Website',
      dotColor: 'blue',
      status: 'In progress',
      completedCount: 0,
      totalCount: 3,
      tasks: [
        { id: 't-3', name: 'Domain connected', status: 'Pending' },
        { id: 't-4', name: 'Theme selected', status: 'Pending' },
        { id: 't-5', name: 'Website live link', status: 'In progress' },
      ],
    },
    {
      id: 'srv-3',
      categoryName: 'Google',
      dotColor: 'green',
      status: 'In progress',
      completedCount: 0,
      totalCount: 3,
      tasks: [
        { id: 't-6', name: 'GMB profile created', status: 'In progress' },
        { id: 't-7', name: 'GMB verification', status: 'Pending' },
        { id: 't-8', name: 'Weekly posts scheduled', status: 'Pending' },
      ],
    },
  ],
  updates: [
    {
      id: 'upd-1',
      title: 'Reply on TK-1043: Invoice copy required',
      category: 'Abhishek Sahu · 1 Oct, 12:10 pm',
      iconType: 'help',
    },
    {
      id: 'upd-2',
      title: 'Invoice generated — completed',
      category: 'Billing',
      iconType: 'check',
    },
    {
      id: 'upd-3',
      title: 'Payment confirmed — in progress',
      category: 'Billing',
      iconType: 'pulse',
    },
    {
      id: 'upd-4',
      title: 'Website live link — in progress',
      category: 'Website',
      iconType: 'pulse',
    },
    {
      id: 'upd-5',
      title: 'GMB profile created — in progress',
      category: 'Google',
      iconType: 'pulse',
    },
  ],
  tickets: [
    {
      id: 'tk-1046',
      ticketNumber: 'TK-1046',
      status: 'Pending',
      priority: 'High',
      timestamp: '5 Oct, 10:12 am',
      title: 'Website theme colour not matching our logo',
      message:
        'You: The website header is blue but our logo is red & gold. Please change the theme colour.',
      senderName: 'Satyam Tiwari',
    },
    {
      id: 'tk-1043',
      ticketNumber: 'TK-1043',
      status: 'Completed',
      priority: 'Medium',
      timestamp: '1 Oct, 11:30 am',
      title: 'Invoice copy required',
      message: 'Abhishek Sahu: Invoice sent to satyam@ email. Thank you!',
      senderName: 'Abhishek Sahu',
    },
  ],
}
