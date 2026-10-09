import React from 'react';
import { Clock, Calendar as CalendarIcon, Bell } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// 1. SUB-COMPONENT: DAILY ATTENDANCE CARD
// ==========================================
interface DailyAttendanceProps {
  date?: string;
  isPresent?: boolean;
  checkInTime?: string;
  checkOutTime?: string | null;
  isWorking?: boolean;
  stats: { present: number; absent: number; percentage: number };
  onCheckOut?: () => void;
  onMarkLeave?: () => void;
}

const DailyAttendanceCard: React.FC<DailyAttendanceProps> = ({
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
    <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-[#e6f4ea] rounded-[10px]">
            <Clock className="w-5 h-5 text-[#4caf50]" />
          </div>
          <h2 className="text-[19px] font-bold text-gray-900">Today · {date}</h2>
        </div>
        {isPresent && (
          <span className="px-4 py-1 text-[13px] font-bold text-[#2e7d32] bg-[#e6f4ea] rounded-full">
            Present
          </span>
        )}
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#f8f9fa] rounded-xl p-4">
          <p className="text-[14px] text-gray-500 mb-1">Check-in</p>
          <p className="text-[18px] font-bold text-gray-900">{checkInTime}</p>
        </div>
        <div className="bg-[#f8f9fa] rounded-xl p-4">
          <p className="text-[14px] text-gray-500 mb-1">Check-out</p>
          <p className="text-[18px] font-bold text-gray-900">{checkOutTime || '—'}</p>
        </div>
        <div className="bg-[#f8f9fa] rounded-xl p-4">
          <p className="text-[14px] text-gray-500 mb-1">Working</p>
          <p className="text-[18px] font-bold text-gray-900">
            {isWorking ? 'In progress' : 'Completed'}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onCheckOut}
        className="w-full py-3.5 mb-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[16px] font-semibold rounded-[14px] transition-colors shadow-sm"
      >
        Check out
      </button>

      {/* Secondary Action */}
      <div className="text-center mb-6">
        <button 
          onClick={onMarkLeave}
          className="text-[15px] font-medium text-[#dc3545] hover:text-[#b02a37] transition-colors"
        >
          Mark today as leave / absent
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#e8f5e9] rounded-xl py-4 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold text-[#2e7d32] leading-tight">{stats.present}</span>
          <span className="text-[14px] text-[#2e7d32]">Present</span>
        </div>
        <div className="bg-[#fde8e8] rounded-xl py-4 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold text-[#c62828] leading-tight">{stats.absent}</span>
          <span className="text-[14px] text-[#c62828]">Absent</span>
        </div>
        <div className="bg-[#e8eaf6] rounded-xl py-4 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold text-[#283593] leading-tight">{stats.percentage}%</span>
          <span className="text-[14px] text-[#283593]">Attendance</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. SUB-COMPONENT: CALENDAR VIEW
// ==========================================
type DayStatus = 'present' | 'absent' | 'default' | 'off';

interface AttendanceCalendarProps {
  month?: number;
  year?: number;
  absentDays?: number[];
  currentDay?: number;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  month = 8, // 8 = September
  year = 2026,
  absentDays = [3, 17, 24],
  currentDay = 30,
}) => {
  const dateObj = new Date(year, month, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = dateObj.getDay();
  const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: startDayOffset }, (_, i) => i);

  const getDayStatus = (day: number): DayStatus => {
    const dayOfWeek = new Date(year, month, day).getDay();
    if (dayOfWeek === 0) return 'off';
    if (absentDays.includes(day)) return 'absent';
    return 'present';
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-[#eef2ff] rounded-xl">
            <CalendarIcon className="w-5 h-5 text-[#4f46e5]" />
          </div>
          <h2 className="text-[19px] font-bold text-gray-900">
            {monthName} {year}
          </h2>
        </div>
        <span className="text-[14px] text-gray-400 font-medium">Sundays off</span>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-[13px] font-semibold text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {emptySlots.map((slot) => (
          <div key={`empty-${slot}`} className="h-12 rounded-xl" />
        ))}

        {daysArray.map((day) => {
          const status = getDayStatus(day);
          const isToday = day === currentDay;

          return (
            <div
              key={day}
              className={cn(
                "h-12 flex items-center justify-center rounded-xl text-[15px] font-medium transition-all cursor-pointer",
                status === 'present' && "bg-[#e8f5e9] text-[#2e7d32]",
                status === 'absent' && "bg-[#fde8e8] text-[#c62828]",
                status === 'off' && "bg-[#f8f9fa] text-gray-400",
                isToday && "border-[2.5px] border-[#2563eb] bg-transparent text-gray-900 font-bold"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-[5px] border border-[#a5d6a7] bg-[#e8f5e9]" />
          <span className="text-[13px] text-gray-500">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-[5px] border border-[#ef9a9a] bg-[#fde8e8]" />
          <span className="text-[13px] text-gray-500">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-[5px] border-[2px] border-[#2563eb] bg-transparent" />
          <span className="text-[13px] text-gray-500">Today</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN PAGE COMPONENT (UserPage.tsx)
// ==========================================
export default function UserPage() {
  const handleCheckOut = () => {
    alert("Checked out successfully!");
  };

  const handleMarkLeave = () => {
    if (window.confirm("Are you sure you want to mark today as leave?")) {
      console.log("Marked as leave");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Top Navigation Header --- */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-2xl font-bold text-gray-900 leading-none">Attendance</h1>
            <span className="text-[15px] text-gray-500 leading-none pb-[1px]">
              Track your daily attendance
            </span>
          </div>
          
          {/* Notification Bell */}
          <button className="relative p-2.5 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-yellow-500 rounded-full border-2 border-white">
              3
            </span>
          </button>
        </header>

        {/* --- Main Grid Layout --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Daily Stats */}
          <DailyAttendanceCard 
            date="30 Sep"
            checkInTime="9:42 am"
            checkOutTime={null}
            isPresent={true}
            isWorking={true}
            stats={{ present: 23, absent: 3, percentage: 88 }}
            onCheckOut={handleCheckOut}
            onMarkLeave={handleMarkLeave}
          />

          {/* Right Column: Monthly Calendar */}
          <AttendanceCalendar 
            month={8} // September
            year={2026}
            absentDays={[3, 17, 24]}
            currentDay={30}
          />
          
        </div>
      </div>
    </div>
  );
}