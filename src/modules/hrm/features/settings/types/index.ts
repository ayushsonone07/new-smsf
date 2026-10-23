export interface CompanyProfile {
  companyName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  logoUrl: string;
  timezone: string;
  currency: string;
}

export interface CompanyProfileUpdate {
  companyName: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
}

export interface WorkingHours {
  workingDays: string[];
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  weeklyOffDays: string[];
}

export interface WorkingHoursUpdate {
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
  gracePeriodMinutes?: number;
  breakDurationMinutes?: number;
  weeklyOffDays?: string[];
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: "NATIONAL" | "REGIONAL" | "COMPANY";
}

export interface RolePermission {
  role: string;
  permissions: string[];
}

export interface NotificationSetting {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  leaveReminders: boolean;
  attendanceAlerts: boolean;
}

export interface NotificationSettingUpdate {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  leaveReminders?: boolean;
  attendanceAlerts?: boolean;
}

export interface ProfileSettings {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordLastChangedAt: string;
  activeSessionCount: number;
  loginAlertsEnabled: boolean;
}

export interface ThemeSettings {
  mode: "light" | "dark" | "system";
}

export interface ThemeSettingsUpdate {
  mode: "light" | "dark" | "system";
}

export interface LanguageSettings {
  language: string;
  timezone: string;
  dateFormat: string;
}

export interface LanguageSettingsUpdate {
  language?: string;
  timezone?: string;
  dateFormat?: string;
}
