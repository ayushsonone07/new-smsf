export { default as SettingsPage } from "./pages/SettingsPage";
export { UpdateProfilePage } from "./pages/UpdateProfilePage";
export { RoleBasedAccessPage } from "./pages/RoleBasedAccessPage";
export {
  useCompanyProfile,
  useWorkingHours,
  useNotifications,
  useSecuritySettings,
  useThemeSettings,
  useLanguageSettings,
} from "./hooks";
export { settingsService } from "./services";
export type {
  CompanyProfile,
  WorkingHours,
  Holiday,
  RolePermission,
  NotificationSetting,
  ProfileSettings,
  SecuritySettings,
  ThemeSettings,
  LanguageSettings,
} from "./types";
