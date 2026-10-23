import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { settingsService } from "../services";

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

export const settingsKeys = {
  all: ["settings"] as const,
  company: ["settings", "company"] as const,
  hours: ["settings", "working-hours"] as const,
  notifications: ["settings", "notifications"] as const,
  security: ["settings", "security"] as const,
  theme: ["settings", "theme"] as const,
  language: ["settings", "language"] as const,
};

export function useCompanyProfile() {
  return useQuery<CompanyProfile, Error>({
    queryKey: settingsKeys.company,
    queryFn: () => settingsService.getCompanyProfile(),
  });
}

export function useWorkingHours() {
  return useQuery<WorkingHours, Error>({
    queryKey: settingsKeys.hours,
    queryFn: () => settingsService.getWorkingHours(),
  });
}

export function useNotifications() {
  return useQuery<NotificationSetting, Error>({
    queryKey: settingsKeys.notifications,
    queryFn: () => settingsService.getNotifications(),
  });
}

export function useSecuritySettings() {
  return useQuery<SecuritySettings, Error>({
    queryKey: settingsKeys.security,
    queryFn: () => settingsService.getSecurity(),
  });
}

export function useThemeSettings() {
  return useQuery<ThemeSettings, Error>({
    queryKey: settingsKeys.theme,
    queryFn: () => settingsService.getTheme(),
  });
}

export function useLanguageSettings() {
  return useQuery<LanguageSettings, Error>({
    queryKey: settingsKeys.language,
    queryFn: () => settingsService.getLanguage(),
  });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation<CompanyProfile, Error, CompanyProfileUpdate>({
    mutationFn: (input) => settingsService.updateCompanyProfile(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.company }),
  });
}

export function useUpdateWorkingHours() {
  const qc = useQueryClient();
  return useMutation<WorkingHours, Error, WorkingHoursUpdate>({
    mutationFn: (input) => settingsService.updateWorkingHours(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.hours }),
  });
}

export function useUpdateNotifications() {
  const qc = useQueryClient();
  return useMutation<NotificationSetting, Error, NotificationSettingUpdate>({
    mutationFn: (input) => settingsService.updateNotifications(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.notifications }),
  });
}

export function useUpdateTheme() {
  const qc = useQueryClient();
  return useMutation<ThemeSettings, Error, ThemeSettingsUpdate>({
    mutationFn: (input) => settingsService.updateTheme(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.theme }),
  });
}

export function useUpdateLanguage() {
  const qc = useQueryClient();
  return useMutation<LanguageSettings, Error, LanguageSettingsUpdate>({
    mutationFn: (input) => settingsService.updateLanguage(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.language }),
  });
}
