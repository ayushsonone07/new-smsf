import { useState, type ReactNode } from "react";

import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";
import { getApiErrorMessage } from "@shared/lib";

import { Button } from "@hrm/components/ui/button";
import { Input } from "@hrm/components/ui/input";
import { cn } from "@hrm/lib/utils";

import { usePasswordReset } from "../hooks";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const { resetPassword } = usePasswordReset();

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validationError = !email.trim()
    ? "Please enter your email address."
    : !EMAIL_PATTERN.test(email.trim())
      ? "Please enter a valid email address."
      : otp.trim().length !== 6
        ? "Please enter the 6-digit OTP received via email."
        : password.length > 0 && password.length < MIN_PASSWORD_LENGTH
          ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
          : password.length > MAX_PASSWORD_LENGTH
            ? `Password must be no more than ${MAX_PASSWORD_LENGTH} characters.`
            : confirmPassword.length > 0 && password !== confirmPassword
              ? "Passwords do not match."
              : null;

  const canSubmit = EMAIL_PATTERN.test(email.trim())
    && otp.trim().length === 6
    && password.length >= MIN_PASSWORD_LENGTH
    && password.length <= MAX_PASSWORD_LENGTH
    && password === confirmPassword
    && !resetPassword.isPending;

  const errorMessage = localError ?? (resetPassword.error ? getApiErrorMessage(resetPassword.error) : null);

  const submit = () => {
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    resetPassword.mutate(
      { email: email.trim(), otp: otp.trim(), password },
      {
        onSuccess: () => {
          toast.success("Password reset successfully", "Sign in with your new password.");
          void navigate(ROUTES.login, { replace: true });
        },
      },
    );
  };

  return (
    <AuthShell>
      <div className="rounded-[2rem] border border-white/35 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-500 text-white shadow-xl shadow-red-500/30">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">Reset your password</h2>
          <p className="mt-2 text-sm text-slate-300">
            Enter your email, the 6-digit OTP sent to your inbox, and your new password.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="mt-8 space-y-5"
          noValidate
        >
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-slate-100">
              Email address
            </label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setLocalError(null);
                resetPassword.reset();
              }}
              disabled={resetPassword.isPending}
              className="mbg-auth-input h-12 rounded-2xl border border-white/35 bg-slate-950/80 px-4 text-white placeholder:text-slate-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="reset-otp" className="mb-2 block text-sm font-semibold text-slate-100">
              6-Digit OTP
            </label>
            <Input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                setLocalError(null);
                resetPassword.reset();
              }}
              disabled={resetPassword.isPending}
              className="mbg-auth-input h-12 rounded-2xl border border-white/35 bg-slate-950/80 px-4 text-center text-lg font-mono tracking-widest text-white placeholder:text-slate-500"
              placeholder="123456"
            />
          </div>

          <PasswordInput
            id="reset-password"
            label="New password"
            value={password}
            show={showPassword}
            disabled={resetPassword.isPending}
            onChange={(value) => {
              setPassword(value);
              setLocalError(null);
              resetPassword.reset();
            }}
            onToggle={() => setShowPassword((value) => !value)}
          />

          <PasswordInput
            id="reset-password-confirm"
            label="Confirm new password"
            value={confirmPassword}
            show={showPassword}
            disabled={resetPassword.isPending}
            onChange={(value) => {
              setConfirmPassword(value);
              setLocalError(null);
              resetPassword.reset();
            }}
          />

          {errorMessage ? (
            <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-2xl bg-red-500 text-base font-bold text-white hover:bg-red-600"
          >
            {resetPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {resetPassword.isPending ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
        <p className="mt-8 text-center text-xs text-slate-400">
          <Link to={ROUTES.login} className="font-medium text-red-400 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function PasswordInput({
  id,
  label,
  value,
  show,
  disabled,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle?: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-100">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH + 1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={cn(
            "mbg-auth-input h-12 rounded-2xl border border-white/35 bg-slate-950/80 px-4 text-white placeholder:text-slate-500",
            onToggle && "pr-12",
          )}
          placeholder={label}
        />
        {onToggle ? (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={onToggle}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-8 text-white">
      <main className="relative z-10 w-full max-w-md">{children}</main>
    </div>
  );
}

export default ResetPasswordPage;
