import { useEffect, useState } from "react";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@app/store";

import {
  clearAuth,
  loginUser,
  selectAuthError,
  selectAuthStatus,
  selectIsAuthenticated,
} from "@features/auth";
import { ROUTES } from "@shared/constants";
import { checkHrmServiceHealth } from "@shared/services";
import { CrmToHrmLoader } from "@/modules/hrm/components";

import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

interface LoginFormState {
  email: string;
  password: string;
  remember: boolean;
}

interface LocationStateWithFrom {
  from?: { pathname?: string };
  forceShowForm?: boolean;
}

const INITIAL: LoginFormState = { email: "", password: "", remember: false };

const STATS = [
  { value: "248", label: "Employees", tone: "text-white" },
  { value: "96.2%", label: "Attendance", tone: "text-[#44e487]" },
  { value: "21 days", label: "Avg time-to-hire", tone: "text-[#ffc21c]" },
];

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authStatus = useAppSelector(selectAuthStatus);
  const authError = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const fromState = location.state as LocationStateWithFrom | null;
  const [form, setForm] = useState<LoginFormState>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Proactive offline and health check states
  const [forceShowForm, setForceShowForm] = useState(Boolean(fromState?.forceShowForm));
  const [checkingHealth, setCheckingHealth] = useState(!fromState?.forceShowForm);
  const [isHealthOffline, setIsHealthOffline] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  const submitting = authStatus === "loading";
  const errorMessage = localError ?? authError;

  // No initial health check on login page mount - show form immediately
  // Health check only runs when user clicks "Login Again" button
  useEffect(() => {
    if (forceShowForm) {
      setCheckingHealth(false);
      setIsHealthOffline(false);
      setOfflineError(null);
    } else {
      // Default to showing form, no blocking health check
      setCheckingHealth(false);
      setIsHealthOffline(false);
      setOfflineError(null);
    }
  }, [forceShowForm]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void navigate(fromState?.from?.pathname ?? ROUTES.dashboard, { replace: true });
  }, [isAuthenticated, fromState, navigate]);

  const onChange = <K extends keyof LoginFormState>(key: K, value: LoginFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (localError) setLocalError(null);
    if (authError) dispatch(clearAuth());
  };

  const handleSubmit = () => {
    if (!form.email.trim() || !form.password) {
      setLocalError("Please enter your email and password.");
      return;
    }

    setLocalError(null);
    void dispatch(
      loginUser({ email: form.email.trim(), password: form.password, remember: form.remember }),
    );
  };

  const isReduxErrorOffline =
    authError &&
    (authError.toLowerCase().includes("network error") ||
      authError.toLowerCase().includes("failed to fetch") ||
      authError.toLowerCase().includes("offline") ||
      authError.toLowerCase().includes("503") ||
      authError.toLowerCase().includes("502") ||
      authError.toLowerCase().includes("504") ||
      authError.toLowerCase().includes("timeout") ||
      authError.toLowerCase().includes("unreachable"));

  // If a submission fails with network offline error, revert forceShowForm to show offline loader
  useEffect(() => {
    if (isReduxErrorOffline) {
      setForceShowForm(false);
    }
  }, [isReduxErrorOffline]);

  const isOffline = (isHealthOffline || Boolean(isReduxErrorOffline)) && !forceShowForm;

  if (checkingHealth && !forceShowForm) {
    return (
      <CrmToHrmLoader
        isLoading={true}
        titleOverride="Checking HRM service..."
        subtitleOverride="Connecting to HRM server..."
      />
    );
  }

  if (isOffline) {
    return (
      <CrmToHrmLoader
        isLoading={false}
        error={offlineError || authError || "The HRM backend service is currently offline or unreachable."}
        onBackToLogin={() => navigate("/login")}
        onLoginAgain={() => {
          if (authError) dispatch(clearAuth());
          setCheckingHealth(true);
          setIsHealthOffline(false);
          setOfflineError(null);
          void checkHrmServiceHealth(true, 3500).then((result) => {
            setCheckingHealth(false);
            if (!result.isOnline) {
              setIsHealthOffline(true);
              setOfflineError(result.error || "The HRM backend service is currently offline or unreachable.");
            }
          });
        }}
        onLoginWithHrm={() => {
          if (authError) dispatch(clearAuth());
          setIsHealthOffline(false);
          setForceShowForm(true);
        }}
      />
    );
  }

  return (
    <div className="mbg-login-reference min-h-screen bg-[#f7f8fa] text-[#142033]">
      <div className="grid min-h-screen lg:grid-cols-[40.25%_59.75%]">
        <aside className="relative hidden min-h-screen overflow-hidden bg-[#1e2127] px-[48px] py-[48px] text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f27609] text-lg font-bold shadow-[inset_0_-1px_1px_rgba(0,0,0,.13)]">
              M
            </div>
            <div>
              <p className="text-[20px] font-bold leading-none tracking-[-0.55px]">MBG HRM</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[1.5px] text-[#a7bad8]">
                MBG CARD · PEOPLE PLATFORM
              </p>
            </div>
          </div>

          <div className="my-auto max-w-[395px] -translate-y-1">
            <h1 className="text-[40px] font-bold leading-[1.14] tracking-[-1.15px]">
              Every people
              <br />
              decision, one
              <br />
              workspace.
            </h1>
             <p className="mt-4 text-[16px] leading-6 tracking-[-0.2px] text-[#b6c3d7]">
               Hiring, attendance and performance for MBG Card — with analytics built into
               every module.
             </p>
            <div className="mt-8 flex gap-3">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[100px] rounded-xl border border-[#3c444f] bg-[#282e36]/80 px-[18px] py-[15px]"
                >
                  <p
                    className={`whitespace-nowrap text-[23px] font-bold leading-6 tracking-[-0.8px] ${stat.tone}`}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-[.2px] text-[#a7bad8]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-[#8291a8]">© 2026 MBG Card India Pvt Ltd · Jabalpur</p>
        </aside>

        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-6 py-12 sm:px-10">
          <div className="w-full max-w-[400px] -translate-y-1">
            <header>
              <h2 className="text-[28px] font-bold leading-8 tracking-[-.8px] text-[#111827]">
                Sign in
              </h2>
              <p className="mt-2 text-[14px] text-[#5d6d84]">Use your MBG Card work account.</p>
            </header>

            <form
              className="mt-7"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
              noValidate
            >
              <label
                htmlFor="email"
                className="mb-[7px] block text-[12px] font-bold text-[#26354b]"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => onChange("email", event.target.value)}
                disabled={submitting}
                className="mbg-reference-input h-[45px] w-full rounded-[10px] border border-[#d2d9e3] bg-white px-[15px] text-[14px] text-[#172238] outline-none placeholder:text-[#8793a4]"
                placeholder="you@mbgcard.com"
              />

              <label
                htmlFor="password"
                className="mb-[7px] mt-[17px] block text-[12px] font-bold text-[#26354b]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  disabled={submitting}
                  className="mbg-reference-input h-[45px] w-full rounded-[10px] border border-[#d2d9e3] bg-white px-[15px] pr-[45px] text-[14px] text-[#172238] outline-none placeholder:text-[#8793a4]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={submitting}
                  className="absolute right-0 top-1/2 grid h-[45px] w-[45px] -translate-y-1/2 place-items-center text-[#64738b] hover:text-[#172238] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="mt-[17px] flex items-center justify-between text-[13px]">
                <label className="flex cursor-pointer select-none items-center gap-2 text-[#64738b]">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => onChange("remember", event.target.checked)}
                    disabled={submitting}
                    className="h-[13px] w-[13px] appearance-none rounded-[3px] border border-[#748195] bg-white checked:border-[#ef7105] checked:bg-[#ef7105]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="font-medium text-[#f1700a] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {errorMessage ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
                >
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-[18px] flex h-[47px] w-full items-center justify-center rounded-[10px] bg-[#ed7005] text-[14px] font-bold text-white transition-colors hover:bg-[#d86200] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Return to Task CRM Login
                </button>
              </div>
            </form>

          </div>
        </main>
      </div>
      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        initialEmail={form.email}
      />
    </div>
  );
}

export default LoginPage;
