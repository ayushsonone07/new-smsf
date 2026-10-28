import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { ACTIVE_API_BASE_URL } from "../../../config/api.config";
import { RefreshButton } from "../../../components/ui/RefreshButton";

// Templates + sending live ENTIRELY in the CRM backend (static/template/sales-*.html), sent from
// info@mbgcard.com. This page just collects inputs and calls the backend.
//
// This is a PUBLIC page, so it never triggers a login redirect. The backend still
// requires the configured sales-mailer secret before it will send an email.

interface FormState {
  packageKey: string;
  ownerName: string;
  businessName: string;
  customerEmail: string;
  salesName: string;
  designation: string;
  salesPhone: string;
  salesEmail: string;
  ccType: "cc" | "bcc";
  customerPhone: string;
  amount: string;
  paymentLink: string;
}

const EMPTY: FormState = {
  packageKey: "FIFTEEN_MONTH54",
  ownerName: "",
  businessName: "",
  customerEmail: "",
  salesName: "",
  designation: "",
  salesPhone: "",
  salesEmail: "",
  ccType: "cc",
  customerPhone: "",
  amount: "",
  paymentLink: "",
};

const SEND_COOLDOWN_SECONDS = 69;
const VERIFIED_SECRET_STORAGE_KEY = "sales-mailer-verified-secret";

// The 5 new GMB plans — the filter button below shows ONLY these, hiding the rest.
const NEW_GMB_PLAN_KEYS = new Set([
  "FULL_MBG_COMBO",
  "GMB_AUTO_POSTING",
  "WEBSITE_LOCAL_SEO_LANDING_PAGES",
  "PLATINUM_WEBSITE_FULL_GMB",
  "REVIEW_MANAGEMENT",
]);

const FALLBACK_PACKAGES = [
  { key: "FIFTEEN_MONTH54", label: "Automation + 54000 — 15-Month (₹54,000)" },
  { key: "MONTHLY", label: "Monthly Plan (₹6,900)" },
  { key: "GOOGLE", label: "Google (₹17,700)" },
  { key: "AUTOMATION", label: "Automation (₹46,000)" },
  { key: "THREE_MONTH", label: "3-Month Plan (₹25,000)" },
  { key: "WEBSITE_GOOGLE", label: "Website + Google (₹29,500)" },
  { key: "FIFTEEN_MONTH", label: "Automation + 36000 — 15-Month (₹36,000)" },
  { key: "AUTOMATION_WEBSITE", label: "Automation + Website (₹25,000)" },
  { key: "GMB", label: "GMB Optimisation Plans (from ₹5,000)" },
  { key: "FULL_MBG_COMBO", label: "Full-GMB-Combo (₹11,800)" },
  { key: "GMB_AUTO_POSTING", label: "GMB Auto Posting Plans (₹5,000)" },
  { key: "WEBSITE_LOCAL_SEO_LANDING_PAGES", label: "Website + Local SEO Landing Pages Plans (₹10,000)" },
  { key: "PLATINUM_WEBSITE_FULL_GMB", label: "Platinum Website + Full GMB Plans (₹21,000)" },
  { key: "REVIEW_MANAGEMENT", label: "Review Management Plans (₹5,000)" },
];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isCustomerPhone = (v: string) => /^[6-9]\d{9}$/.test(v.trim());
const MIN_LINK_AMOUNT = 100;
const MAX_LINK_AMOUNT = 500000;
const isLinkAmount = (v: string) =>
  /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) >= MIN_LINK_AMOUNT && Number(v) <= MAX_LINK_AMOUNT;

type PendingAction = "send" | "generate";

// The backend reads amount as a number, so an empty field is sent as null rather than "".
const toRequest = (f: FormState) => ({
  ...f,
  customerPhone: f.customerPhone.trim(),
  amount: f.amount.trim() ? Number(f.amount) : null,
});

class SalesApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "SalesApiError";
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ACTIVE_API_BASE_URL
).replace(/\/$/, "");

async function salesFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
  const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const path = normalized.startsWith("/api") ? normalized : `/api${normalized}`;
  const url = `${API_BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });
  } catch (err: unknown) {
    throw new SalesApiError(err instanceof Error ? err.message : "Network error", 0);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const msg = json?.message || `Request failed with status ${res.status}`;
    throw new SalesApiError(msg, res.status, json);
  }

  return { data: json };
}

const publicApi = {
  get: <T = any>(endpoint: string) => salesFetch<T>(endpoint, { method: "GET" }),
  post: <T = any>(endpoint: string, body?: unknown) =>
    salesFetch<T>(endpoint, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};

export function SalesProposalPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [packages, setPackages] = useState<Array<{ key: string; label: string }>>([]);
  const [packagesRefreshing, setPackagesRefreshing] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const [secretKeyError, setSecretKeyError] = useState("");
  const [secretKeyStatus, setSecretKeyStatus] = useState<"unverified" | "verifying" | "verified">("unverified");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [status, setStatus] = useState<{ type: "idle" | "sending" | "ok" | "err"; msg?: string }>({ type: "idle" });
  const [linkStatus, setLinkStatus] = useState<{ type: "idle" | "generating" | "err"; msg?: string }>({ type: "idle" });
  const [pendingAction, setPendingAction] = useState<PendingAction>("send");

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // A generated link belongs to the customer + amount + package it was made for; changing any of
  // them drops the link so a fresh one has to be generated.
  useEffect(() => {
    setForm((f) => (f.paymentLink ? { ...f, paymentLink: "" } : f));
    setLinkStatus({ type: "idle" });
  }, [form.customerPhone, form.customerEmail, form.amount, form.packageKey]);

  // Renders the current form via the backend template (used by both auto-refresh and the button).
  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const r = await publicApi.post<{ success?: boolean; data?: string }>("/sales/preview", toRequest(form));
      setPreviewHtml(r.data?.data ?? "");
    } catch {
      setPreviewHtml("<p style='padding:16px'>Preview unavailable</p>");
    } finally {
      setPreviewLoading(false);
    }
  }, [form]);

  // Load the package list from the backend (on mount and from the packages refresh button).
  const loadPackages = useCallback(
    () =>
      publicApi
        .get<{ success?: boolean; data?: Array<{ key: string; label: string }> }>("/sales/packages")
        .then((r) => setPackages(r.data?.data ?? FALLBACK_PACKAGES))
        .catch(() => setPackages(FALLBACK_PACKAGES)),
    [],
  );

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const refreshPackages = async () => {
    setPackagesRefreshing(true);
    try {
      await loadPackages();
    } finally {
      setPackagesRefreshing(false);
    }
  };

  // All Plans = old plans only. New Plans button = ONLY the 5 new plans.
  const visiblePackages = showNewOnly
    ? packages.filter((p) => NEW_GMB_PLAN_KEYS.has(p.key))
    : packages.filter((p) => !NEW_GMB_PLAN_KEYS.has(p.key));

  // When the filter hides the current selection, jump to the first visible package.
  useEffect(() => {
    if (visiblePackages.length === 0) return;
    if (!visiblePackages.some((p) => p.key === form.packageKey)) {
      setForm((f) => ({ ...f, packageKey: visiblePackages[0].key }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewOnly, packages]);

  // Render the preview ONLY when a package is selected (and once on first load) — typing in the
  // fields does NOT hit the API. Use the Refresh button to re-render with the latest field values.
  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.packageKey, form.paymentLink]);

  useEffect(() => {
    if (cooldownUntil === null) {
      setCooldownSeconds(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) setCooldownUntil(null);
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  // A verified key is retained only for this browser tab. Re-verify it after a page refresh so the
  // UI never trusts stale session storage if the backend key has changed.
  useEffect(() => {
    const storedSecret = window.sessionStorage.getItem(VERIFIED_SECRET_STORAGE_KEY);
    if (!storedSecret) return;

    let active = true;
    setSecretKeyStatus("verifying");
    publicApi
      .post<{ success?: boolean; message?: string }>("/sales/verify-key", { secretKey: storedSecret })
      .then((response) => {
        if (!active || !response.data?.success) return;
        setSecretKey(storedSecret);
        setSecretKeyInput(storedSecret);
        setSecretKeyStatus("verified");
      })
      .catch(() => {
        if (!active) return;
        window.sessionStorage.removeItem(VERIFIED_SECRET_STORAGE_KEY);
        setSecretKeyStatus("unverified");
      });

    return () => {
      active = false;
    };
  }, []);

  const linkErrors: string[] = [];
  if (!form.ownerName.trim()) linkErrors.push("Customer name");
  if (!isEmail(form.customerEmail)) linkErrors.push("Valid customer email");
  if (!isCustomerPhone(form.customerPhone)) linkErrors.push("Valid 10-digit customer phone");
  if (!isLinkAmount(form.amount)) linkErrors.push(`Amount (₹${MIN_LINK_AMOUNT}–₹${MAX_LINK_AMOUNT.toLocaleString("en-IN")})`);
  if (!form.salesName.trim()) linkErrors.push("Sales person name");

  const errors: string[] = [...linkErrors];
  if (!form.salesPhone.trim()) errors.push("Sales person number");
  if (form.salesEmail.trim() && !isEmail(form.salesEmail)) errors.push("Valid sales person email");
  if (linkErrors.length === 0 && !form.paymentLink) errors.push("Payment link (generate it)");
  const canGenerateLink =
    linkErrors.length === 0 &&
    linkStatus.type !== "generating" &&
    status.type !== "sending" &&
    secretKeyStatus !== "verifying";
  const canSend =
    errors.length === 0 &&
    status.type !== "sending" &&
    linkStatus.type !== "generating" &&
    secretKeyStatus !== "verifying" &&
    cooldownSeconds === 0;

  const startCooldown = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : SEND_COOLDOWN_SECONDS;
    setCooldownSeconds(safeSeconds);
    setCooldownUntil(Date.now() + safeSeconds * 1000);
  };

  const clearVerifiedSecret = () => {
    window.sessionStorage.removeItem(VERIFIED_SECRET_STORAGE_KEY);
    setSecretKey("");
    setSecretKeyInput("");
    setSecretKeyStatus("unverified");
  };

  const sendProposal = async (verifiedSecret: string) => {
    setStatus({ type: "sending" });
    try {
      const res = await publicApi.post<{ success: boolean; message?: string; data?: any }>("/sales/send-proposal", {
        ...toRequest(form),
        secretKey: verifiedSecret,
      });
      if (res.data?.success) {
        startCooldown(SEND_COOLDOWN_SECONDS);
        setStatus({ type: "ok", msg: res.data?.message || `Email sent to ${form.customerEmail}` });
      } else {
        setStatus({ type: "err", msg: res.data?.message || "Failed to send" });
      }
    } catch (error: unknown) {
      if (error instanceof SalesApiError) {
        const message = error.data?.message || error.message || "Failed to send email";
        const remainingSeconds = Number(error.data?.data);
        if (error.status === 429 && Number.isFinite(remainingSeconds)) {
          startCooldown(remainingSeconds);
          setStatus({ type: "idle" });
          return;
        }
        if (error.status === 403) {
          clearVerifiedSecret();
          setSecretKeyError("The stored secret key is no longer valid. Please enter it again.");
          setPendingAction("send");
          setShowSecretPrompt(true);
        }
        setStatus({ type: "err", msg: message });
      } else {
        setStatus({ type: "err", msg: error instanceof Error ? error.message : "Failed to send email" });
      }
    }
  };

  const generatePaymentLink = async (verifiedSecret: string) => {
    setLinkStatus({ type: "generating" });
    const requestedFor = {
      phone: form.customerPhone,
      email: form.customerEmail,
      amount: form.amount,
      packageKey: form.packageKey,
    };
    try {
      const res = await publicApi.post<{ success: boolean; message?: string; data?: string }>("/sales/payment-link", {
        ...toRequest(form),
        secretKey: verifiedSecret,
      });
      const link: string = res.data?.data || "";
      if (!res.data?.success || !link) {
        setLinkStatus({ type: "err", msg: res.data?.message || "Failed to generate payment link" });
        return;
      }
      // Ignore the result if the customer details changed while the link was being generated.
      setForm((f) =>
        f.customerPhone === requestedFor.phone &&
        f.customerEmail === requestedFor.email &&
        f.amount === requestedFor.amount &&
        f.packageKey === requestedFor.packageKey
          ? { ...f, paymentLink: link }
          : f,
      );
      setLinkStatus({ type: "idle" });
    } catch (error: unknown) {
      if (error instanceof SalesApiError) {
        if (error.status === 403) {
          clearVerifiedSecret();
          setSecretKeyError("The stored secret key is no longer valid. Please enter it again.");
          setPendingAction("generate");
          setShowSecretPrompt(true);
        }
        setLinkStatus({ type: "err", msg: error.data?.message || error.message || "Failed to generate payment link" });
      } else {
        setLinkStatus({ type: "err", msg: error instanceof Error ? error.message : "Failed to generate payment link" });
      }
    }
  };

  // Runs the action with the verified key, or asks for the key first.
  const withSecretKey = (action: PendingAction) => {
    if (secretKeyStatus === "verified" && secretKey) {
      void (action === "send" ? sendProposal(secretKey) : generatePaymentLink(secretKey));
      return;
    }
    setPendingAction(action);
    setSecretKeyError("");
    setShowSecretPrompt(true);
  };

  const handleSend = () => {
    if (!canSend) return;
    withSecretKey("send");
  };

  const handleGenerateLink = () => {
    if (!canGenerateLink) return;
    withSecretKey("generate");
  };

  const handleSecretKeySubmit = async () => {
    const candidate = secretKeyInput.trim();
    if (!candidate) {
      setSecretKeyError("Enter your secret key to continue.");
      return;
    }

    setSecretKeyError("");
    setSecretKeyStatus("verifying");
    try {
      const response = await publicApi.post<{ success: boolean; message?: string }>("/sales/verify-key", {
        secretKey: candidate,
      });
      if (!response.data?.success) {
        setSecretKeyStatus("unverified");
        setSecretKeyError(response.data?.message || "Invalid secret key");
        return;
      }

      window.sessionStorage.setItem(VERIFIED_SECRET_STORAGE_KEY, candidate);
      setSecretKey(candidate);
      setSecretKeyStatus("verified");
      setShowSecretPrompt(false);
      await (pendingAction === "send" ? sendProposal(candidate) : generatePaymentLink(candidate));
    } catch (error: unknown) {
      setSecretKeyStatus("unverified");
      if (error instanceof SalesApiError) {
        setSecretKeyError(error.data?.message || error.message || "Unable to verify secret key");
      } else {
        setSecretKeyError(error instanceof Error ? error.message : "Unable to verify secret key");
      }
    }
  };

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const label = "block text-xs font-semibold text-slate-600 mb-1";
  const selectedLabel = packages.find((p) => p.key === form.packageKey)?.label || "proposal";
  const cooldownLabel = `${String(Math.floor(cooldownSeconds / 60)).padStart(2, "0")}:${String(cooldownSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 py-8 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="https://www.mbgcard.in/mbg_logo.png"
            onError={(e) => {
              e.currentTarget.src = "/mbg-card-logo.svg";
            }}
            alt="MBG"
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sales Proposal Mailer</h1>
            <p className="text-sm text-slate-500">Send a professional package proposal to your customer.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>Package *</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewOnly(false)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      !showNewOnly
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All Plans ({packages.filter((p) => !NEW_GMB_PLAN_KEYS.has(p.key)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewOnly(true)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      showNewOnly
                        ? "bg-blue-600 text-white"
                        : "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    New GMB Plans (5)
                  </button>
                  <RefreshButton
                    onRefresh={refreshPackages}
                    isRefreshing={packagesRefreshing}
                    label="packages"
                    size={13}
                    className="ml-auto"
                  />
                </div>
                <select
                  className={`${input} transition-opacity ${packagesRefreshing ? "pointer-events-none opacity-60" : ""}`}
                  aria-busy={packagesRefreshing}
                  value={form.packageKey}
                  onChange={(e) => set("packageKey", e.target.value)}
                >
                  {visiblePackages.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Customer name *</label>
                <input
                  className={input}
                  value={form.ownerName}
                  onChange={(e) => set("ownerName", e.target.value)}
                  placeholder="Owner / contact name"
                />
              </div>
              <div>
                <label className={label}>Business name</label>
                <input
                  className={input}
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="(defaults to customer name)"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Customer email *</label>
                <input
                  className={input}
                  value={form.customerEmail}
                  onChange={(e) => set("customerEmail", e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className={label}>Sales person name *</label>
                <input
                  className={input}
                  value={form.salesName}
                  onChange={(e) => set("salesName", e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className={label}>Designation</label>
                <input
                  className={input}
                  value={form.designation}
                  onChange={(e) => set("designation", e.target.value)}
                  placeholder="e.g. Business Consultant"
                />
              </div>
              <div>
                <label className={label}>Sales person number *</label>
                <input
                  className={input}
                  value={form.salesPhone}
                  onChange={(e) => set("salesPhone", e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <div>
                <label className={label}>Sales person email (CC/BCC)</label>
                <input
                  className={input}
                  value={form.salesEmail}
                  onChange={(e) => set("salesEmail", e.target.value)}
                  placeholder="you@mbgcard.com"
                />
              </div>
              <div>
                <label className={label}>Add sales email as</label>
                <select className={input} value={form.ccType} onChange={(e) => set("ccType", e.target.value as "cc" | "bcc")}>
                  <option value="cc">CC (customer sees it)</option>
                  <option value="bcc">BCC (hidden)</option>
                </select>
              </div>
              <div>
                <label className={label}>Customer phone number *</label>
                <input
                  className={input}
                  inputMode="numeric"
                  maxLength={10}
                  value={form.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className={label}>Amount (₹) *</label>
                <input
                  className={input}
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d{0,6}(\.\d{0,2})?$/.test(v)) set("amount", v);
                  }}
                  placeholder="Amount to collect"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Payment link *</label>
                <div className="flex gap-2">
                  <input
                    className={`${input} bg-slate-50 text-slate-600`}
                    value={form.paymentLink}
                    readOnly
                    placeholder="Generated for the customer's phone number and amount"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    disabled={!canGenerateLink}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                      canGenerateLink ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300"
                    }`}
                  >
                    {linkStatus.type === "generating"
                      ? "Generating…"
                      : form.paymentLink
                        ? "Regenerate"
                        : "Generate link"}
                  </button>
                </div>
                <p className={`mt-1 text-[11px] ${linkStatus.type === "err" ? "text-red-600" : "text-slate-400"}`}>
                  {linkStatus.type === "err"
                    ? linkStatus.msg
                    : form.paymentLink
                      ? `Link for ${form.customerPhone} · ₹${Number(form.amount).toLocaleString("en-IN")} · valid for 30 days. The customer's payment ID will verify on registration against this number.`
                      : "Fill in the customer's name, email, phone, amount and your name, then generate the link."}
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <p className="mt-4 text-xs text-amber-600">Required: {errors.join(", ")}</p>
            )}

            {secretKeyStatus === "verified" && (
              <div className="mt-4 flex justify-end">
                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  ✓ Verified
                </span>
              </div>
            )}

            {secretKeyStatus === "verifying" && (
              <div className="mt-4 flex justify-end">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  Verifying…
                </span>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
                canSend ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300"
              }`}
            >
              {status.type === "sending"
                ? "Sending…"
                : secretKeyStatus === "verifying"
                  ? "Verifying secret key…"
                  : cooldownSeconds > 0
                    ? `Send again in ${cooldownLabel}`
                    : `Send "${selectedLabel}" proposal`}
            </button>

            {status.type === "ok" && (
              <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">✅ {status.msg}</div>
            )}
            {status.type === "err" && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ {status.msg}</div>
            )}

            <p className="mt-3 text-[11px] text-slate-400">
              Sends from <strong>info@mbgcard.com</strong> via the CRM backend. The sales person is added as{" "}
              {form.ccType.toUpperCase()}.
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <div>
                <div className="text-xs font-semibold text-slate-500">Preview</div>
                <div className="text-[10px] text-slate-400">Updates on package change — hit Refresh after editing fields.</div>
              </div>
              <button
                type="button"
                onClick={loadPreview}
                disabled={previewLoading}
                title="Refresh template"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${previewLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              aria-busy={previewLoading}
              className={`h-[640px] w-full rounded-lg border border-slate-200 bg-white transition-opacity ${previewLoading ? "opacity-60" : ""}`}
            />
          </div>
        </div>
      </div>

      {showSecretPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="secret-key-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 id="secret-key-title" className="text-lg font-bold text-slate-900">
              Verify secret key
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the key once. It will stay verified for this browser tab and your proposal details will remain unchanged.
            </p>

            <label className={`${label} mt-4`}>Secret key</label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                className={`${input} pr-11`}
                value={secretKeyInput}
                onChange={(event) => {
                  setSecretKeyInput(event.target.value);
                  setSecretKeyError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && secretKeyStatus !== "verifying") void handleSecretKeySubmit();
                }}
                placeholder="Enter sales mailer secret key"
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSecretKey((visible) => !visible)}
                aria-label={showSecretKey ? "Hide secret key" : "Show secret key"}
                title={showSecretKey ? "Hide secret key" : "Show secret key"}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-500 hover:text-slate-700"
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {secretKeyError && <p className="mt-2 text-sm text-red-600">{secretKeyError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSecretPrompt(false);
                  setSecretKeyError("");
                  if (secretKeyStatus === "verifying") setSecretKeyStatus("unverified");
                }}
                disabled={secretKeyStatus === "verifying"}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSecretKeySubmit()}
                disabled={secretKeyStatus === "verifying" || !secretKeyInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {secretKeyStatus === "verifying"
                  ? "Verifying…"
                  : pendingAction === "send"
                    ? "Verify & send email"
                    : "Verify & generate link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesProposalPage;
