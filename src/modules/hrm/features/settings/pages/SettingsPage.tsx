import { useState } from "react";

import {
  Building2,
  Clock,
  CalendarDays,
  Bell,
  User,
  Shield,
  Globe,
  Check,
  X,
} from "lucide-react";

import { env } from "@config/env";
import { useAuth, useMyProfile } from "@features/auth";
import { PageHeader, Card, CardSkeleton, ErrorDisplay, StatusBadge, StaggerContainer, StaggerItem } from "@shared/components/ui";
import { cn } from "@/lib/utils";



import {
  useCompanyProfile,
  useWorkingHours,
  useNotifications,
  useSecuritySettings,
  useLanguageSettings,
} from "../hooks";

import type {
  CompanyProfile,
  LanguageSettings,
  NotificationSetting,
  SecuritySettings,
  WorkingHours,
} from "../types";

const COMPANY_DEMO: CompanyProfile = {
  companyName: "MBG Card India Pvt Ltd",
  email: "hr@mbgcard.com",
  phone: "+91 98765 43210",
  website: "https://mbgcard.com",
  address: "Jabalpur, Madhya Pradesh, India",
  logoUrl: "",
  timezone: "Asia/Kolkata (IST)",
  currency: "INR (₹)",
};

const HOURS_DEMO: WorkingHours = {
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  startTime: "10:30",
  endTime: "19:00",
  gracePeriodMinutes: 15,
  breakDurationMinutes: 60,
  weeklyOffDays: ["Sunday"],
};

const NOTIFICATIONS_DEMO: NotificationSetting = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  leaveReminders: true,
  attendanceAlerts: true,
};

const SECURITY_DEMO: SecuritySettings = {
  twoFactorEnabled: true,
  passwordLastChangedAt: "42 days ago",
  activeSessionCount: 2,
  loginAlertsEnabled: true,
};

const LANGUAGE_DEMO: LanguageSettings = {
  language: "English (India)",
  timezone: "Asia/Kolkata (IST)",
  dateFormat: "DD MMM YYYY",
};

const DEMO_ENABLED = env.enableDemoData;

type SettingsTab =
  | "company"
  | "hours"
  | "holidays"
  | "notifications"
  | "profile"
  | "security"
  | "language";

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: typeof Building2;
  adminOnly: boolean;
}

const TABS: TabDef[] = [
  { id: "company", label: "Company Profile", icon: Building2, adminOnly: true },
  { id: "hours", label: "Working Hours", icon: Clock, adminOnly: true },
  { id: "holidays", label: "Holidays", icon: CalendarDays, adminOnly: true },
  { id: "notifications", label: "Notifications", icon: Bell, adminOnly: false },
  { id: "profile", label: "Profile", icon: User, adminOnly: false },
  { id: "security", label: "Security", icon: Shield, adminOnly: false },
  { id: "language", label: "Language", icon: Globe, adminOnly: false },
];

function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <StaggerContainer>
      <StaggerItem>
        <PageHeader title="Settings" description="Manage your application preferences." />
      </StaggerItem>

      <StaggerItem>
        <div className="flex flex-nowrap gap-2 overflow-x-auto border-b border-border pb-1 scrollbar-none">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  activeTab === tab.id
                    ? "border-b-2 border-primary bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="min-h-[400px]">{renderTabContent(activeTab)}</div>
      </StaggerItem>
    </StaggerContainer>
  );
}

export { SettingsPage };
export default SettingsPage;

function renderTabContent(tab: SettingsTab) {
  switch (tab) {
    case "company":
      return <CompanySection />;
    case "hours":
      return <WorkingHoursSection />;
    case "holidays":
      return <HolidaysSection />;
    case "notifications":
      return <NotificationSection />;
    case "profile":
      return <ProfileSection />;
    case "security":
      return <SecuritySection />;
    case "language":
      return <LanguageSection />;
  }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="md">
      <h3 className="mb-4 text-base font-semibold text-card-foreground">{title}</h3>
      {children}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-44 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-card-foreground">{value}</span>
    </div>
  );
}

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
      <Check size={12} /> Enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <X size={12} /> Disabled
    </span>
  );
}

function CompanySection() {
  const { data, isLoading } = useCompanyProfile();
  if (isLoading) return <CardSkeleton count={1} />;
  const profile = data ?? (DEMO_ENABLED ? COMPANY_DEMO : null);
  if (!profile) return <ErrorDisplay message="Company profile could not be loaded from the server." />;
  return (
    <SectionCard title="Company Profile">
      <div className="space-y-3">
        <Field label="Company Name" value={profile.companyName} />
        <Field label="Email" value={profile.email} />
        <Field label="Phone" value={profile.phone} />
        <Field label="Website" value={profile.website} />
        <Field label="Address" value={profile.address} />
        <Field label="Timezone" value={profile.timezone} />
        <Field label="Currency" value={profile.currency} />
      </div>
    </SectionCard>
  );
}

function WorkingHoursSection() {
  const { data, isLoading } = useWorkingHours();
  if (isLoading) return <CardSkeleton count={1} />;
  const hours = data ?? (DEMO_ENABLED ? HOURS_DEMO : null);
  if (!hours) return <ErrorDisplay message="Working-hours settings could not be loaded from the server." />;
  return (
    <SectionCard title="Working Hours">
      <div className="space-y-3">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <span className="w-44 shrink-0 text-sm font-medium text-muted-foreground">Working Days</span>
          <span className="text-sm text-card-foreground">{hours.workingDays.join(", ") || "—"}</span>
        </div>
        <Field label="Start Time" value={hours.startTime} />
        <Field label="End Time" value={hours.endTime} />
        <Field label="Grace Period" value={`${hours.gracePeriodMinutes} min`} />
        <Field label="Break Duration" value={`${hours.breakDurationMinutes} min`} />
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <span className="w-44 shrink-0 text-sm font-medium text-muted-foreground">Weekly Off Days</span>
          <span className="text-sm text-card-foreground">{hours.weeklyOffDays.join(", ") || "—"}</span>
        </div>
      </div>
    </SectionCard>
  );
}

function HolidaysSection() {
  if (!DEMO_ENABLED) {
    return <SectionCard title="Holidays"><p className="text-sm text-muted-foreground">Use the Holidays page for the authoritative company calendar.</p></SectionCard>;
  }
  const holidays: [string, string, string][] = [
    ["National Coder’s Day", "10 Aug 2026", "Company"],
    ["Independence Day", "15 Aug 2026", "National"],
    ["Gandhi Jayanti", "02 Oct 2026", "National"],
    ["Diwali", "08 Nov 2026", "National"],
  ];
  return (
    <SectionCard title="Upcoming Holidays">
      <div className="divide-y divide-border">
        {holidays.map(([name, date, type]) => (
          <div key={name} className="flex items-center justify-between gap-4 py-3">
            <div><p className="text-sm font-semibold text-card-foreground">{name}</p><p className="text-xs text-muted-foreground">{date}</p></div>
            <StatusBadge label={type} tone={type === "Company" ? "emerald" : "amber"} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function NotificationSection() {
  const { data, isLoading } = useNotifications();
  if (isLoading) return <CardSkeleton count={1} />;
  const notifications = data ?? (DEMO_ENABLED ? NOTIFICATIONS_DEMO : null);
  if (!notifications) return <ErrorDisplay message="Notification preferences could not be loaded from the server." />;
  return (
    <SectionCard title="Notification Preferences">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-card-foreground">Channels</p>
          <div className="flex flex-wrap gap-3">
            <BoolBadge value={notifications.emailNotifications} /> <span className="text-sm text-muted-foreground">Email</span>
            <BoolBadge value={notifications.pushNotifications} /> <span className="text-sm text-muted-foreground">Push</span>
            <BoolBadge value={notifications.smsNotifications} /> <span className="text-sm text-muted-foreground">SMS</span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-card-foreground">Alerts</p>
          <div className="flex flex-wrap gap-3">
            <BoolBadge value={notifications.leaveReminders} /> <span className="text-sm text-muted-foreground">Leave Reminders</span>
            <BoolBadge value={notifications.attendanceAlerts} /> <span className="text-sm text-muted-foreground">Attendance Alerts</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  if (isLoading) return <CardSkeleton count={1} />;
  if (!profile) return <ErrorDisplay message="Profile details could not be loaded from the server." />;
  return (
    <SectionCard title="Profile">
      <div className="space-y-3">
        <Field label="Name" value={profile.name} />
        <Field label="Email" value={profile.email} />
        <Field label="Phone" value={profile.phone ?? "—"} />
        <Field label="Employee Code" value={profile.employeeCode} />
        <Field label="Department" value={profile.departmentName ?? "—"} />
        <Field label="Designation" value={profile.designationName ?? "—"} />
        <Field label="Manager" value={profile.managerName ?? "—"} />
        <Field label="Role" value={user?.role ?? profile.role} />
      </div>
    </SectionCard>
  );
}

function SecuritySection() {
  const { data, isLoading } = useSecuritySettings();
  if (isLoading) return <CardSkeleton count={1} />;
  const security = data ?? (DEMO_ENABLED ? SECURITY_DEMO : null);
  if (!security) return <ErrorDisplay message="Security settings could not be loaded from the server." />;
  return (
    <SectionCard title="Security">
      <div className="space-y-3">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <span className="w-44 shrink-0 text-sm font-medium text-muted-foreground">Two-Factor Auth</span>
          <BoolBadge value={security.twoFactorEnabled} />
        </div>
        <Field label="Password Last Changed" value={security.passwordLastChangedAt || "—"} />
        <Field label="Active Sessions" value={String(security.activeSessionCount)} />
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <span className="w-44 shrink-0 text-sm font-medium text-muted-foreground">Login Alerts</span>
          <BoolBadge value={security.loginAlertsEnabled} />
        </div>
      </div>
    </SectionCard>
  );
}



function LanguageSection() {
  const { data, isLoading } = useLanguageSettings();
  if (isLoading) return <CardSkeleton count={1} />;
  const language = data ?? (DEMO_ENABLED ? LANGUAGE_DEMO : null);
  if (!language) return <ErrorDisplay message="Language settings could not be loaded from the server." />;
  return (
    <SectionCard title="Language & Region">
      <div className="space-y-3">
        <Field label="Language" value={language.language} />
        <Field label="Timezone" value={language.timezone} />
        <Field label="Date Format" value={language.dateFormat} />
      </div>
    </SectionCard>
  );
}

