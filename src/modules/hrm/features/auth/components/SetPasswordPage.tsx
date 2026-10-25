import { useState, type ReactNode } from "react";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, AlertCircle, Shield, Mail, RefreshCw, LogIn } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { ROUTES } from "@shared/constants";
import { getApiErrorMessage } from "@shared/lib";

import { Button } from "@hrm/components/ui/button";
import { Input } from "@hrm/components/ui/input";
import { cn } from "@hrm/lib/utils";

import { authService } from "../services";

const MIN_PASSWORD_LENGTH = 8;

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const setPwd = useMutation({
    mutationFn: (pwd: string) => authService.setPassword(token, pwd),
    onSuccess: () => setLocalError(null),
  });

  if (!token) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Invalid Link</h2>
          <p className="mt-2 text-sm text-slate-500">
            This password-setup link is missing its token. Ask HR to send a new one.
          </p>
          <Link
            to={ROUTES.login}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Go to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  const submitting = setPwd.isPending;
  const rawError = setPwd.error ? getApiErrorMessage(setPwd.error) : null;
  const errorMessage = localError ?? rawError;

  // Check if token is already used/expired
  const isTokenUsed = rawError?.toLowerCase().includes("already been used") || 
                      rawError?.toLowerCase().includes("already used") ||
                      rawError?.toLowerCase().includes("expired");

  // Calculate password strength
  const calculateStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 25;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(calculateStrength(value));
    if (localError) setLocalError(null);
  };

  const handleConfirmChange = (value: string) => {
    setConfirm(value);
    if (localError) setLocalError(null);
  };

  const handleSubmit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    setLocalError(null);
    setPwd.mutate(password);
  };

  if (setPwd.isSuccess) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Password Set Successfully</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your password has been set. You can now sign in to the HRM dashboard.
          </p>
          <Link
            to={ROUTES.login}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            Go to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  // Show dedicated screen for already used/expired token
  if (isTokenUsed) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Link Already Used or Expired</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            This password setup link has already been used or has expired. 
            For security, each link can only be used once.
          </p>
          <div className="mt-8 space-y-3">
            <Link
              to={ROUTES.login}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <LogIn className="h-4 w-4" />
              Go to Login
            </Link>
            <p className="text-sm text-slate-500">Already have a password? Sign in directly.</p>
            <hr className="my-4 border-slate-200" />
            <Link
              to={ROUTES.login}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Request New Link via Email
            </Link>
            <p className="text-sm text-slate-500">Don't have access? Use forgot password to get a new reset link.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-6 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
            <p className="text-sm text-slate-500">If you just used the link, try refreshing to confirm.</p>
          </div>
        </div>
      </AuthShell>
    );
  }

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-emerald-500",
  ];

  const strengthIndex = Math.min(Math.floor(passwordStrength / 25), 4);

  return (
    <AuthShell>
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Set Your Password</h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose a secure password for your HRM account. Minimum {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-5"
          noValidate
        >
          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={submitting}
                className={cn(
                  "mbg-auth-input h-12 rounded-xl border border-slate-300 bg-white px-4 pr-12",
                  "text-slate-900 placeholder:text-slate-400",
                  "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
                  errorMessage && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ease-out rounded-full ${strengthColors[strengthIndex]}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium text-slate-600 whitespace-nowrap ${strengthColors[strengthIndex].replace("bg-", "text-")}`}>
                    {strengthLabels[strengthIndex]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={password.length >= 8 ? "text-emerald-600" : "text-slate-400"}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className={password.length >= 8 ? "text-emerald-600" : ""}>
                    Minimum 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={/[A-Z]/.test(password) ? "text-emerald-600" : "text-slate-400"}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>
                    Uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={/[0-9]/.test(password) ? "text-emerald-600" : "text-slate-400"}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className={/[0-9]/.test(password) ? "text-emerald-600" : ""}>
                    Number
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={/[^A-Za-z0-9]/.test(password) ? "text-emerald-600" : "text-slate-400"}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className={/[^A-Za-z0-9]/.test(password) ? "text-emerald-600" : ""}>
                    Special character
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={confirm}
              onChange={(e) => handleConfirmChange(e.target.value)}
              disabled={submitting}
              className={cn(
                "mbg-auth-input h-12 rounded-xl border border-slate-300 bg-white px-4",
                "text-slate-900 placeholder:text-slate-400",
                "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
                errorMessage && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                confirm && password !== confirm && "border-red-500",
                confirm && password === confirm && "border-emerald-500",
              )}
            />
            {confirm && password !== confirm && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Passwords do not match
              </p>
            )}
            {confirm && password === confirm && (
              <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Passwords match
              </p>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">{errorMessage}</div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || password.length < MIN_PASSWORD_LENGTH || password !== confirm}
            className={cn(
              "h-12 w-full rounded-xl font-semibold text-white shadow-sm",
              "transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-sm",
              submitting
                ? "bg-slate-400"
                : password.length >= MIN_PASSWORD_LENGTH && password === confirm
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-300 text-slate-500",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting password...
              </>
            ) : (
              "Set Password"
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          <Link to={ROUTES.login} className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2">
            ← Back to login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 relative">
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgb(241 245 249 / 0.5) 0%, transparent 70%)' }} />
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239CA3AF' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
      }} />

      <main className="relative z-10 w-full">{children}</main>
    </div>
  );
}

export default SetPasswordPage;
