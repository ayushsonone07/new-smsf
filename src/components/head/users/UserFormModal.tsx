import { useState } from "react";
import type { FormEvent } from "react";
import { UserPlus, Eye, EyeOff, X, Loader2 } from "lucide-react";
import { ROLE_OPTIONS } from "./roleMeta";
import type {
  DepartmentUserFormValues,
  DepartmentUserRole,
} from '../../../features/departments/head/types/head.types';

type UserFormMode = "create" | "edit";

interface UserFormModalProps {
  open: boolean;
  mode: UserFormMode;
  onClose: () => void;
  onSubmit: (values: DepartmentUserFormValues) => void;
  /** Pre-fill (edit mode, or defaults for create). */
  initialValues?: Partial<DepartmentUserFormValues>;
  isSubmitting?: boolean;
  error?: string;
  /** Override titles / labels if needed. */
  title?: string;
  submitLabel?: string;
  roleOptions?: { value: DepartmentUserRole; label: string }[];
}

const EMPTY: DepartmentUserFormValues = {
  name: "",
  phone: "",
  target: 75,
  email: "",
  role: "ONBOARDING_EXECUTIVE",
  temporaryPassword: "",
  username: "",
  password: "",
  phoneNumber: "",
};

/**
 * Add / Edit department user form.
 *
 * For create mode:
 * Matches the SMSF reference modal design:
 * - Username (5-20 chars)
 * - Email
 * - Phone Number (10+ digits)
 * - Password (6-12 chars, eye toggle)
 */
export function UserFormModal({
  open,
  onClose,
  ...formProps
}: UserFormModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <UserForm onClose={onClose} {...formProps} />
      </div>
    </div>
  );
}

type UserFormProps = Omit<UserFormModalProps, "open">;

function UserForm({
  mode,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting = false,
  error,
  title,
  submitLabel = "Save user",
  roleOptions = ROLE_OPTIONS,
}: UserFormProps) {
  const [values, setValues] = useState<DepartmentUserFormValues>(() => ({
    ...EMPTY,
    ...initialValues,
    username: initialValues?.username || initialValues?.name || "",
    password: initialValues?.password || initialValues?.temporaryPassword || "",
    phoneNumber: initialValues?.phoneNumber || initialValues?.phone || "",
  }));

  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function update<K extends keyof DepartmentUserFormValues>(
    key: K,
    value: DepartmentUserFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  // Validations per SMSF rules
  const username = values.username || values.name || "";
  const email = values.email || "";
  const phoneNumber = values.phoneNumber || values.phone || "";
  const password = values.password || values.temporaryPassword || "";

  const isUsernameValid = username.trim().length >= 5 && username.trim().length <= 20;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = phoneNumber.replace(/\D/g, "").length >= 10;
  const isPasswordValid = password.length >= 6 && password.length <= 12;

  const isCreateValid = isUsernameValid && isEmailValid && isPhoneValid && isPasswordValid;
  const isEditValid = values.name.trim().length > 1 && isPhoneValid && isEmailValid;

  const isValid = mode === "create" ? isCreateValid : isEditValid;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!isValid || isSubmitting) {
      setTouched({
        username: true,
        email: true,
        phoneNumber: true,
        password: true,
      });
      return;
    }

    onSubmit({
      ...values,
      name: (values.username || values.name).trim(),
      username: (values.username || values.name).trim(),
      email: values.email.trim(),
      phone: (values.phoneNumber || values.phone).trim(),
      phoneNumber: (values.phoneNumber || values.phone).trim(),
      password: values.password || values.temporaryPassword,
      temporaryPassword: values.password || values.temporaryPassword,
    });
  }

  if (mode === "create") {
    return (
      <form onSubmit={handleSubmit} noValidate className="flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-2">
          <div>
            <div className="flex items-center gap-2.5 text-slate-800 text-lg font-bold">
              <UserPlus className="w-5 h-5 text-slate-700" strokeWidth={2.2} />
              <span>Add New Department User</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Create a new account for a department user.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mx-6 mt-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="px-6 py-3 space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={values.username}
              placeholder="Enter username"
              autoComplete="off"
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              onChange={(e) => {
                update("username", e.target.value);
                update("name", e.target.value);
              }}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                touched.username && !isUsernameValid
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-500"
              }`}
            />
            <p className="text-[11px] text-slate-400">
              Username must be between 5 and 20 characters
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={values.email}
              placeholder="Enter email address"
              autoComplete="off"
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              onChange={(e) => update("email", e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                touched.email && !isEmailValid
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-500"
              }`}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={values.phoneNumber}
              placeholder="Enter phone number"
              maxLength={15}
              autoComplete="off"
              onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\d+ -]/g, "");
                update("phoneNumber", clean);
                update("phone", clean);
              }}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                touched.phoneNumber && !isPhoneValid
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-500"
              }`}
            />
            <p className="text-[11px] text-slate-400">
              Phone number must be at least 10 digits (numbers only)
            </p>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={values.password}
                placeholder="Enter password"
                autoComplete="new-password"
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                onChange={(e) => {
                  update("password", e.target.value);
                  update("temporaryPassword", e.target.value);
                }}
                className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  touched.password && !isPasswordValid
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Password must be 6 to 12 characters long
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Add User</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }

  // Edit mode
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col p-6 space-y-4">
      <div className="flex items-start justify-between pb-1 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">
          {title ?? "Edit user"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-700">
          Full name
          <input
            required
            value={values.name}
            placeholder="e.g. Riya Sharma"
            onChange={(event) => update("name", event.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-700">
            Mobile number
            <input
              required
              inputMode="numeric"
              maxLength={15}
              value={values.phone}
              placeholder="10-digit number"
              onChange={(event) => update("phone", event.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Monthly target
            <input
              required
              type="number"
              min={1}
              value={values.target}
              onChange={(event) => update("target", Number(event.target.value))}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          Email
          <input
            required
            type="email"
            value={values.email}
            placeholder="name@gmail.com"
            onChange={(event) => update("email", event.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          Role
          <select
            value={values.role}
            onChange={(event) =>
              update("role", event.target.value as DepartmentUserRole)
            }
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
