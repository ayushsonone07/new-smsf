import React from 'react';
import { 
  Bell, 
  Eye, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// REUSABLE UI COMPONENTS
// ==========================================

const Badge = ({ children, variant = 'gray' }: { children: React.ReactNode, variant?: 'gray' | 'yellow' | 'blue' | 'green' }) => {
  const variants = {
    gray: "bg-gray-100 text-gray-700",
    yellow: "bg-[#fef3c7] text-[#b45309]",
    blue: "bg-[#e0e7ff] text-[#4338ca]",
    green: "bg-[#dcfce7] text-[#15803d]",
  };
  return (
    <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-md", variants[variant])}>
      {children}
    </span>
  );
};

// ==========================================
// 1. SERVICE CARD COMPONENT
// ==========================================
interface ServiceItem {
  label: string;
  status: 'Completed' | 'In progress' | 'Pending';
}

interface ServiceCardProps {
  title: string;
  status: string;
  statusColor: string; // Tailwind color class for the dot
  progressText: string;
  progressPercentage: number;
  items: ServiceItem[];
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, status, statusColor, progressText, progressPercentage, items }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", statusColor)} />
          <h3 className="text-[17px] font-bold text-gray-900">{title}</h3>
        </div>
        <span className="px-3 py-1 text-[12px] font-semibold text-[#4338ca] bg-[#e0e7ff] rounded-full">
          {status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#374151] rounded-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </div>
        <span className="text-[13px] font-medium text-gray-700">{progressText}</span>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3 mt-auto">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {/* Status Icon */}
              {item.status === 'Completed' ? (
                <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
              ) : item.status === 'Pending' ? (
                <div className="w-5 h-5 rounded-full bg-[#fef3c7] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#e0e7ff] flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-[#4f46e5]" />
                </div>
              )}
              <span className="text-[14px] text-gray-700">{item.label}</span>
            </div>
            <span className={cn(
              "text-[13px]",
              item.status === 'Completed' ? "text-gray-400" : "text-gray-500"
            )}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 2. MAIN DASHBOARD COMPONENT
// ==========================================
export default function CustomerDashboard() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-10">
      
      {/* --- Top Header --- */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-end gap-3">
          <h1 className="text-[24px] font-bold text-gray-900 leading-none">Customer Dashboard</h1>
          <span className="text-[15px] text-gray-500 leading-none pb-[2px]">
            What the customer sees — updates live as your team works
          </span>
        </div>
        
        <button className="relative p-2 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-700" />
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-yellow-500 rounded-full border-2 border-white">
            3
          </span>
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">
        
        {/* --- Preview Sub-header --- */}
        <div className="flex items-center gap-2 text-[15px] text-gray-500">
          <Eye className="w-4 h-4" />
          <span>Preview of <strong className="text-gray-900">Lala Company</strong> 's dashboard — every step, call and reply your team makes shows here live.</span>
        </div>

        {/* --- Welcome Banner --- */}
        <div className="bg-[#2563eb] rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
          {/* Left: Company Info */}
          <div>
            <p className="text-white/80 text-[14px] mb-1">Welcome back, Satyam Tiwari</p>
            <h2 className="text-[32px] font-bold leading-tight mb-3">Lala Company</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 bg-[#fcd34d] text-[#92400e] text-[13px] font-bold rounded-md">
                Pending
              </span>
              <span className="px-3 py-1 bg-white/20 text-white text-[13px] font-medium rounded-md">
                Digital Card + Website · 6 months
              </span>
            </div>
          </div>

          {/* Center: Progress */}
          <div className="flex-1 max-w-[300px] w-full">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[42px] font-bold leading-none">13%</span>
              <span className="text-[14px] text-white/80">of your services delivered · 1 of 8 steps</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#fcd34d] rounded-full" style={{ width: '13%' }} />
            </div>
          </div>

          {/* Right: Account Manager */}
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#fcd34d] rounded-lg flex items-center justify-center text-[#92400e] font-bold text-xl">
                A
              </div>
              <div>
                <p className="text-[12px] text-white/80">Your onboarding executive</p>
                <p className="text-[16px] font-semibold">Abhishek Sahu</p>
              </div>
            </div>
            <div className="flex gap-2 ml-2">
              <button className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Phone className="w-5 h-5 text-green-600" />
              </button>
              <button className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </button>
            </div>
          </div>
        </div>

        {/* --- Upcoming Meeting Banner --- */}
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-[#fcd34d] text-[#92400e] rounded-lg w-14 h-14 flex flex-col items-center justify-center shrink-0">
            <span className="text-[11px] font-bold uppercase leading-none">Oct</span>
            <span className="text-[20px] font-bold leading-none">1</span>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#b45309] tracking-wider uppercase mb-1">Your Upcoming Meeting</p>
            <h4 className="text-[17px] font-bold text-gray-900 mb-1">1 Oct 2026, 11:00 am · Google Meet</h4>
            <p className="text-[14px] text-gray-600">With Abhishek Sahu from MBG Card · Website theme demo</p>
          </div>
        </div>

        {/* --- Section: Your Services --- */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[18px] font-bold text-gray-900">Your services</h3>
            <span className="px-2 py-0.5 bg-[#e0e7ff] text-[#4338ca] text-[12px] font-bold rounded-md">3</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ServiceCard 
              title="Billing"
              status="In progress"
              statusColor="bg-gray-500"
              progressText="1/2"
              progressPercentage={50}
              items={[
                { label: 'Invoice generated', status: 'Completed' },
                { label: 'Payment confirmed', status: 'In progress' },
              ]}
            />
            <ServiceCard 
              title="Website"
              status="In progress"
              statusColor="bg-blue-600"
              progressText="0/3"
              progressPercentage={0}
              items={[
                { label: 'Domain connected', status: 'Pending' },
                { label: 'Theme selected', status: 'Pending' },
                { label: 'Website live link', status: 'In progress' },
              ]}
            />
            <ServiceCard 
              title="Google"
              status="In progress"
              statusColor="bg-green-500"
              progressText="0/3"
              progressPercentage={0}
              items={[
                { label: 'GMB profile created', status: 'In progress' },
                { label: 'GMB verification', status: 'Pending' },
                { label: 'Weekly posts scheduled', status: 'Pending' },
              ]}
            />
          </div>
        </div>

        {/* --- Bottom Split: Latest Updates & Help Center --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Latest Updates Panel */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#e0e7ff] rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#4f46e5]" />
              </div>
              <h3 className="text-[18px] font-bold text-gray-900">Latest updates</h3>
            </div>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-[#d97706]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-900">Reply on TK-1043: Invoice copy required</p>
                  <p className="text-[13px] text-gray-500">Abhishek Sahu · 1 Oct, 12:10 pm</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-900">Invoice generated — completed</p>
                  <p className="text-[13px] text-gray-500">Billing</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#e0e7ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-[#4f46e5]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-900">Payment confirmed — in progress</p>
                  <p className="text-[13px] text-gray-500">Billing</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#e0e7ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-[#4f46e5]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-900">Website live link — in progress</p>
                  <p className="text-[13px] text-gray-500">Website</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#e0e7ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-[#4f46e5]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-900">GMB profile created — in progress</p>
                  <p className="text-[13px] text-gray-500">Google</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Center Panel */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#fef3c7] rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-[#d97706]" />
                </div>
                <h3 className="text-[18px] font-bold text-gray-900">Help Center</h3>
              </div>
              <button className="px-4 py-2 bg-[#fcd34d] hover:bg-[#fbbf24] text-[#92400e] text-[14px] font-bold rounded-lg transition-colors">
                + Raise a ticket
              </button>
            </div>

            <div className="space-y-4">
              {/* Ticket 1 */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#2563eb]">TK-1046</span>
                    <Badge variant="blue">Pending</Badge>
                  </div>
                  <span className="text-[12px] text-gray-400">5 Oct, 10:12 am</span>
                </div>
                <h4 className="text-[15px] font-bold text-gray-900 mb-2">Website theme colour not matching our logo</h4>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-900">You:</span> The website header is blue but our logo is red & gold. Please change the theme colour.
                </p>
              </div>

              {/* Ticket 2 */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#2563eb]">TK-1043</span>
                    <Badge variant="green">Completed</Badge>
                  </div>
                  <span className="text-[12px] text-gray-400">1 Oct, 11:30 am</span>
                </div>
                <h4 className="text-[15px] font-bold text-gray-900 mb-2">Invoice copy required</h4>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-900">Abhishek Sahu:</span> Invoice sent to satyam@ email. Thank you!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}