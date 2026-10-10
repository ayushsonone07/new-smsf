import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type DayStatus = 'present' | 'absent' | 'default' | 'off';

interface AttendanceCalendarProps {
  month?: number; // 0-11 (0 = January)
  year?: number;
  absentDays?: number[]; // Array of dates (e.g., [3, 17, 24])
  currentDay?: number; // The day to highlight as "Today"
  className?: string;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  month = 8, // 8 = September
  year = 2026,
  absentDays = [3, 17, 24],
  currentDay = 30,
  className,
}) => {
  // Get month name
  const dateObj = new Date(year, month, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });

  // Calculate grid layout
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday to be 0, Sunday to be 6.
  const firstDayOfMonth = dateObj.getDay();
  const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Generate array of days
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: startDayOffset }, (_, i) => i);

  // Helper to determine day status
  const getDayStatus = (day: number): DayStatus => {
    const dayOfWeek = new Date(year, month, day).getDay();
    
    // 0 = Sunday
    if (dayOfWeek === 0) return 'off';
    if (absentDays.includes(day)) return 'absent';
    return 'present';
  };

  return (
    <div className={cn("w-full max-w-[560px] bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)]", className)}>
      
      {/* --- Header --- */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-[#eef2ff] rounded-lg">
            <CalendarIcon className="w-4 h-4 text-[#4f46e5]" />
          </div>
          <h2 className="text-[16px] font-bold text-gray-900">
            {monthName} {year}
          </h2>
        </div>
        <span className="text-[12px] text-gray-400 font-medium">Sundays off</span>
      </div>

      {/* --- Weekday Headers --- */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-[11px] font-semibold text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* --- Calendar Grid --- */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {/* Empty slots for days before the 1st */}
        {emptySlots.map((slot) => (
          <div key={`empty-${slot}`} className="h-9 rounded-lg" />
        ))}

        {/* Actual days */}
        {daysArray.map((day) => {
          const status = getDayStatus(day);
          const isToday = day === currentDay;

          return (
            <div
              key={day}
              className={cn(
                "h-9 flex items-center justify-center rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                // Status Styles
                status === 'present' && "bg-[#e8f5e9] text-[#2e7d32]",
                status === 'absent' && "bg-[#fde8e8] text-[#c62828]",
                status === 'off' && "bg-[#f8f9fa] text-gray-400",
                // Today Override
                isToday && "border-2 border-[#2563eb] bg-transparent text-gray-900 font-bold"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* --- Legend --- */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-[14px] h-[14px] rounded-[4px] border border-[#a5d6a7] bg-[#e8f5e9]" />
          <span className="text-[11px] text-gray-500">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-[14px] h-[14px] rounded-[4px] border border-[#ef9a9a] bg-[#fde8e8]" />
          <span className="text-[11px] text-gray-500">Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-[14px] h-[14px] rounded-[4px] border-2 border-[#2563eb] bg-transparent" />
          <span className="text-[11px] text-gray-500">Today</span>
        </div>
      </div>

    </div>
  );
};