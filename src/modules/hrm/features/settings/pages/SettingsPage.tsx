import { useEffect, useState } from "react";

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
  Wifi,
  Loader2,
} from "lucide-react";

import { env } from "@config/env";
import { useAuth, useMyProfile } from "@features/auth";
import { PageHeader, Card, CardSkeleton, ErrorDisplay, StatusBadge, StaggerContainer, StaggerItem } from "@shared/components/ui";
import { useToast } from "@shared/components/feedback";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/RefreshButton";



import {
  useCompanyProfile,
  useUpdateCompanyProfile,
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

interface SectionQuery {
  refetch: () => Promise<unknown>;
  isFetching: boolean;
  isLoading: boolean;
}

function SectionCard({
  title,
  children,
  query,
  refreshLabel,
}: {
  title: string;
  children: React.ReactNode;
  /** The query behind this section; adds a refresh button that reloads only it. */
  query?: SectionQuery;
  refreshLabel?: string;
}) {
  const refreshing = Boolean(query && query.isFetching && !query.isLoading);
  return (
    <Card padding="md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
        {query ? (
          <RefreshButton
            onRefresh={() => query.refetch()}
            isRefreshing={query.isFetching}
            label={refreshLabel ?? title.toLowerCase()}
          />
        ) : null}
      </div>
      <div
        className={cn("transition-opacity", refreshing && "pointer-events-none opacity-60")}
        aria-busy={refreshing}
      >
        {children}
      </div>
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
  const query = useCompanyProfile();
  const { data, isLoading } = query;
  if (isLoading) return <CardSkeleton count={1} />;
  const profile = data ?? (DEMO_ENABLED ? COMPANY_DEMO : null);
  if (!profile) return <ErrorDisplay message="Company profile could not be loaded from the server." />;
  return (
    <div className="space-y-6">
      <SectionCard title="Company Profile" query={query} refreshLabel="company profile">
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
      <IpRestrictionCard profile={profile} />
    </div>
  );
}

function IpRestrictionCard({ profile }: { profile: CompanyProfile }) {
  const toast = useToast();
  const updateMutation = useUpdateCompanyProfile();
  const [enabled, setEnabled] = useState(Boolean(profile.isIpRestrictionEnabled));
  const [ips, setIps] = useState(profile.allowedOfficeIps ?? "");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(profile.isIpRestrictionEnabled));
    setIps(profile.allowedOfficeIps ?? "");
  }, [profile.isIpRestrictionEnabled, profile.allowedOfficeIps]);

  const handleDetectIp = async () => {
    setDetecting(true);
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      if (data?.ip) {
        setIps((prev) => {
          const currentList = prev.split(",").map((s) => s.trim()).filter(Boolean);
          if (!currentList.includes(data.ip)) {
            return currentList.length > 0 ? currentList.join(", ") + ", " + data.ip : data.ip;
          }
          return prev;
        });
        toast.success("IP Detected", "Added " + data.ip + " to allowed IPs. Remember to save!");
      }
    } catch {
      toast.error("Detect Failed", "Could not detect IP automatically. Please enter it manually.");
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        companyName: profile.companyName,
        isIpRestrictionEnabled: enabled,
        allowedOfficeIps: ips.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Settings Saved", "Office IP restriction settings updated successfully.");
        },
        onError: () => {
          toast.error("Save Failed", "Could not update office IP restriction settings.");
        },
      }
    );
  };

  const isDirty =
    enabled !== Boolean(profile.isIpRestrictionEnabled) ||
    ips.trim() !== (profile.allowedOfficeIps ?? "").trim();

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wifi size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-card-foreground">Office Network & IP Restriction</h3>
            <p className="text-xs text-muted-foreground">
              Restrict employee Check-in and Check-out to authorized office Wi-Fi / IP addresses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none" />
          </label>
          <span className="text-sm font-medium text-card-foreground">
            {enabled ? "Active" : "Disabled"}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="allowed-ips" className="text-sm font-medium text-card-foreground">
              Allowed Office IP Addresses
            </label>
            <button
              type="button"
              onClick={handleDetectIp}
              disabled={detecting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {detecting ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
              {detecting ? "Detecting..." : "Detect & Add My Current IP"}
            </button>
          </div>
          <input
            id="allowed-ips"
            type="text"
            value={ips}
            onChange={(e) => setIps(e.target.value)}
            placeholder="e.g. 103.21.244.5, 122.161.50.12"
            disabled={!enabled || updateMutation.isPending}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter office public IP addresses separated by commas. If enabled, employees outside these IPs will not be allowed to check in or out.
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <strong>Admin Exemption:</strong> Company Administrators are always exempt from IP restrictions so you can never be locked out of the system.
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {updateMutation.isPending ? "Saving..." : "Save IP Settings"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function WorkingHoursSection() {
  const query = useWorkingHours();
  const { data, isLoading } = query;
  if (isLoading) return <CardSkeleton count={1} />;
  const hours = data ?? (DEMO_ENABLED ? HOURS_DEMO : null);
  if (!hours) return <ErrorDisplay message="Working-hours settings could not be loaded from the server." />;
  return (
    <SectionCard title="Working Hours" query={query} refreshLabel="working hours">
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
  const query = useNotifications();
  const { data, isLoading } = query;
  if (isLoading) return <CardSkeleton count={1} />;
  const notifications = data ?? (DEMO_ENABLED ? NOTIFICATIONS_DEMO : null);
  if (!notifications) return <ErrorDisplay message="Notification preferences could not be loaded from the server." />;
  return (
    <SectionCard title="Notification Preferences" query={query} refreshLabel="notification preferences">
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
  const query = useMyProfile();
  const { data: profile, isLoading } = query;
  if (isLoading) return <CardSkeleton count={1} />;
  if (!profile) return <ErrorDisplay message="Profile details could not be loaded from the server." />;
  return (
    <SectionCard title="Profile" query={query} refreshLabel="profile">
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
  const query = useSecuritySettings();
  const { data, isLoading } = query;
  if (isLoading) return <CardSkeleton count={1} />;
  const security = data ?? (DEMO_ENABLED ? SECURITY_DEMO : null);
  if (!security) return <ErrorDisplay message="Security settings could not be loaded from the server." />;
  return (
    <SectionCard title="Security" query={query} refreshLabel="security settings">
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
  const query = useLanguageSettings();
  const { data, isLoading } = query;
  if (isLoading) return <CardSkeleton count={1} />;
  const language = data ?? (DEMO_ENABLED ? LANGUAGE_DEMO : null);
  if (!language) return <ErrorDisplay message="Language settings could not be loaded from the server." />;
  return (
    <SectionCard title="Language & Region" query={query} refreshLabel="language settings">
      <div className="space-y-3">
        <Field label="Language" value={language.language} />
        <Field label="Timezone" value={language.timezone} />
        <Field label="Date Format" value={language.dateFormat} />
      </div>
    </SectionCard>
  );
}

