import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface TopNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface LoadingCardProps {
  title?: string;
  subtitle?: string;
}

// ==========================================
// 1. TOP NAVIGATION BAR COMPONENT
// ==========================================
const TopNav: React.FC<TopNavProps> = ({ 
  activeTab = "Loading", 
  onTabChange 
}) => {
  const tabs = ["Loading", "Verifying", "Success", "Failure", "Error"];

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 select-none">
      <span className="text-[15px] font-medium text-gray-500">Preview state</span>
      
      {/* Tab Container */}
      <div className="flex items-center bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange && onTabChange(tab)}
              className={cn(
                "px-5 py-1.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                isActive
                  ? "bg-[#2563eb] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Standalone Badge */}
      <span className="px-3 py-1.5 text-[14px] font-medium text-[#a16207] bg-[#fef9c3] rounded-lg">
        Standalone · no login
      </span>
    </div>
  );
};

// ==========================================
// 2. CUSTOM LOADING SPINNER
// ==========================================
const CustomSpinner = () => {
  return (
    <div className="relative flex items-center justify-center w-[68px] h-[68px]">
      {/* Background Track Circle */}
      <div className="absolute inset-0 rounded-full border-[4px] border-[#e5e7eb]/60" />
      
      {/* Animated Blue Arc */}
      <svg 
        className="absolute inset-0 w-full h-full animate-spin text-[#2563eb]" 
        viewBox="0 0 50 50"
        style={{ animationDuration: '0.8s' }}
      >
        <circle
          cx="25"
          cy="25"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="35 100" // Creates the small arc shape
        />
      </svg>
    </div>
  );
};

// ==========================================
// 3. MAIN LOADING CARD COMPONENT
// ==========================================
const LoadingCard: React.FC<LoadingCardProps> = ({
  title = "Loading...",
  subtitle = "Opening your confirmation link.",
}) => {
  return (
    <div className="bg-white rounded-[32px] p-10 w-full max-w-[460px] flex flex-col items-center justify-center shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/50 backdrop-blur-sm">
      
      {/* MBG Logo Section */}
      <div className="flex items-center gap-3 mb-10">
        {/* Logo Icon */}
        <div className="flex items-center justify-center w-10 h-10 bg-[#2563eb] rounded-xl shadow-inner relative overflow-hidden">
          <span className="text-white text-[10px] font-bold tracking-wider z-10">MBG</span>
          {/* Orange arc at bottom of logo */}
          <div className="absolute -bottom-2 w-8 h-4 border-[3px] border-[#f59e0b] rounded-[50%]" />
        </div>
        {/* Logo Text */}
        <span className="text-[22px] font-semibold text-gray-900 tracking-tight">
          MBG Card
        </span>
      </div>

      {/* Loading Spinner Container */}
      <div className="flex items-center justify-center w-[120px] h-[120px] bg-[#f0f4ff] rounded-[32px] mb-8">
        <CustomSpinner />
      </div>

      {/* Text Content */}
      <h2 className="text-[28px] font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-[16px] text-gray-500">{subtitle}</p>
    </div>
  );
};

// ==========================================
// 4. MAIN PAGE LAYOUT (To match the exact background)
// ==========================================
export default function PreviewStatePage() {
  const [activeTab, setActiveTab] = React.useState("Loading");

  return (
    <div className="min-h-screen p-6 lg:p-8 font-sans bg-gray-50">
      
      {/* Top Navigation */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area with Gradient Background */}
      <div className="relative w-full h-[calc(100vh-100px)] rounded-[32px] overflow-hidden flex items-center justify-center shadow-sm border border-gray-200/60">
        
        {/* Complex Background Gradient matching the image */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#fef3c7] z-0" />
        
        {/* Background Soft Blurs (Optional for extra polish) */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent z-0" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-yellow-100/40 via-transparent to-transparent z-0" />

        {/* Floating Center Card */}
        <div className="relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <LoadingCard />
        </div>
        
      </div>
    </div>
  );
}