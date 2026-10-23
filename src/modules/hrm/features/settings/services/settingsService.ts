import { hrApiGet, hrApiPut } from "@shared/services";

import type {
  CompanyProfile,
  CompanyProfileUpdate,
  LanguageSettings,
  LanguageSettingsUpdate,
  NotificationSetting,
  NotificationSettingUpdate,
  SecuritySettings,
  ThemeSettings,
  ThemeSettingsUpdate,
  WorkingHours,
  WorkingHoursUpdate,
} from "../types";

export const SETTINGS_ENDPOINTS = {
  company: "/api/v1/settings/company",
  workingHours: "/api/v1/settings/working-hours",
  notifications: "/api/v1/settings/notifications",
  security: "/api/v1/settings/security",
  theme: "/api/v1/settings/theme",
  language: "/api/v1/settings/language",
} as const;

export const settingsService = {
  async getCompanyProfile(): Promise<CompanyProfile> {
    return hrApiGet<CompanyProfile>(SETTINGS_ENDPOINTS.company);
  },
  async getWorkingHours(): Promise<WorkingHours> {
    return hrApiGet<WorkingHours>(SETTINGS_ENDPOINTS.workingHours);
  },
  async getNotifications(): Promise<NotificationSetting> {
    return hrApiGet<NotificationSetting>(SETTINGS_ENDPOINTS.notifications);
  },
  async getSecurity(): Promise<SecuritySettings> {
    return hrApiGet<SecuritySettings>(SETTINGS_ENDPOINTS.security);
  },
  async getTheme(): Promise<ThemeSettings> {
    return hrApiGet<ThemeSettings>(SETTINGS_ENDPOINTS.theme);
  },
  async getLanguage(): Promise<LanguageSettings> {
    return hrApiGet<LanguageSettings>(SETTINGS_ENDPOINTS.language);
  },

  async updateCompanyProfile(input: CompanyProfileUpdate): Promise<CompanyProfile> {
    return hrApiPut<CompanyProfile>(SETTINGS_ENDPOINTS.company, input);
  },
  async updateWorkingHours(input: WorkingHoursUpdate): Promise<WorkingHours> {
    return hrApiPut<WorkingHours>(SETTINGS_ENDPOINTS.workingHours, input);
  },
  async updateNotifications(input: NotificationSettingUpdate): Promise<NotificationSetting> {
    return hrApiPut<NotificationSetting>(SETTINGS_ENDPOINTS.notifications, input);
  },
  async updateTheme(input: ThemeSettingsUpdate): Promise<ThemeSettings> {
    return hrApiPut<ThemeSettings>(SETTINGS_ENDPOINTS.theme, input);
  },
  async updateLanguage(input: LanguageSettingsUpdate): Promise<LanguageSettings> {
    return hrApiPut<LanguageSettings>(SETTINGS_ENDPOINTS.language, input);
  },
};
