import React from 'react';
import { Clock } from 'lucide-react';
// --- Types ---
interface DailyAttendanceProps {
  date?: string; // e.g., "30 Sep"
  isPresent?: boolean;
  checkInTime?: string;
  checkOutTime?: string | null;
  isWorking?: boolean;
  stats: {
    present: number;
    absent: number;
    percentage: number;
  };
  onCheckOut?: () => void;
  onMarkLeave?: () => void;
}

export const DailyAttendanceCard: React.FC<DailyAttendanceProps> = ({
  date = "30 Sep",
  isPresent = true,
  checkInTime = "9:42 am",
  checkOutTime = null,
  isWorking = true,
  stats = { present: 23, absent: 3, percentage: 88 },
  onCheckOut,
  onMarkLeave,
}) => {
  return (
    <div className="w-full max-w-3xl bg-white rounded-2xl p-4 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06),0_8px_16px_-2px_rgba(0,0,0,0.03)] border border-gray-100 font-sans">
      
      {/* --- Header Row --- */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-[#e6f4ea] rounded-[8px]">
            <Clock className="w-4 h-4 text-[#4caf50]" />
          </div>
          <h2 className="text-[16px] font-bold text-gray-900">
            Today · {date}
          </h2>
        </div>
        {isPresent && (
          <span className="px-3 py-0.5 text-[12px] font-bold text-[#2e7d32] bg-[#e6f4ea] rounded-full">
            Present
          </span>
        )}
      </div>

      {/* --- Status Grid --- */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Check-in Box */}
        <div className="bg-[#f8f9fa] rounded-lg p-3">
          <p className="text-[13px] text-gray-500 mb-0.5">Check-in</p>
          <p className="text-[16px] font-bold text-gray-900">{checkInTime}</p>
        </div>
        
        {/* Check-out Box */}
        <div className="bg-[#f8f9fa] rounded-lg p-3">
          <p className="text-[13px] text-gray-500 mb-0.5">Check-out</p>
          <p className="text-[16px] font-bold text-gray-900">{checkOutTime || '—'}</p>
        </div>
        
        {/* Working Box */}
        <div className="bg-[#f8f9fa] rounded-lg p-3">
          <p className="text-[13px] text-gray-500 mb-0.5">Working</p>
          <p className="text-[16px] font-bold text-gray-900">
            {isWorking ? 'In progress' : 'Completed'}
          </p>
        </div>
      </div>

      {/* --- Action Button --- */}
      <button
        onClick={onCheckOut}
        className="w-full py-2.5 mb-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[14px] font-semibold rounded-[12px] transition-colors shadow-sm"
      >
        Check out
      </button>

      {/* --- Secondary Action --- */}
      <div className="text-center mb-4">
        <button 
          onClick={onMarkLeave}
          className="text-[13px] font-medium text-[#dc3545] hover:text-[#b02a37] transition-colors"
        >
          Mark today as leave / absent
        </button>
      </div>

      {/* --- Stats Summary --- */}
      <div className="grid grid-cols-3 gap-2">
        {/* Present Stat */}
        <div className="bg-[#e8f5e9] rounded-lg py-3 flex flex-col items-center justify-center">
          <span className="text-[19px] font-bold text-[#2e7d32] leading-tight">
            {stats.present}
          </span>
          <span className="text-[13px] text-[#2e7d32]">Present</span>
        </div>
        
        {/* Absent Stat */}
        <div className="bg-[#fde8e8] rounded-lg py-3 flex flex-col items-center justify-center">
          <span className="text-[19px] font-bold text-[#c62828] leading-tight">
            {stats.absent}
          </span>
          <span className="text-[13px] text-[#c62828]">Absent</span>
        </div>
        
        {/* Percentage Stat */}
        <div className="bg-[#e8eaf6] rounded-lg py-3 flex flex-col items-center justify-center">
          <span className="text-[19px] font-bold text-[#283593] leading-tight">
            {stats.percentage}%
          </span>
          <span className="text-[13px] text-[#283593]">Attendance</span>
        </div>
      </div>

    </div>
  );
};