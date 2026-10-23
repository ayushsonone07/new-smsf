import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createPortal } from "react-dom";

/* ─── public types ──────────────────────────────────────────── */

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastInput {
  variant?: ToastVariant | undefined;
  title: string;
  description?: string | undefined;
  /** Milliseconds before auto-dismiss. 0 keeps the toast pinned. Default 4500. */
  duration?: number | undefined;
}

interface ToastApi {
  show: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

/* ─── context ───────────────────────────────────────────────── */

const ToastContext = createContext<ToastApi | null>(null);

interface ToastRecord {
  id: string;
  variant: ToastVariant;
  title: string;
  description: string | undefined;
}

const MAX_VISIBLE = 5;
const DEFAULT_DURATION_MS = 4500;

/**
 * Mount once at the app root (inside AppProviders). Exposes a `useToast()` hook
 * to every descendant — features call `useToast().success("...")` etc.
 *
 * Backend integration: when an axios call returns the standard envelope, pass
 * `data.message` directly as the toast title. Use `getApiErrorMessage(error)`
 * from @shared/lib on failures to surface the backend's message instead of the
 * raw axios string.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const handle = timers.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record: ToastRecord = {
        id,
        variant: input.variant ?? "info",
        title: input.title,
        description: input.description,
      };
      setToasts((prev) => [...prev, record].slice(-MAX_VISIBLE));
      const duration = input.duration ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        const handle = window.setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
    },
    [dismiss],
  );

  // Clear all pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((h) => window.clearTimeout(h));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => show({ variant: "success", title, description }),
      error: (title, description) => show({ variant: "error", title, description }),
      info: (title, description) => show({ variant: "info", title, description }),
      warning: (title, description) => show({ variant: "warning", title, description }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Throws if used outside a ToastProvider — surfaces the misuse loudly. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ─── viewport (portal to document.body) ────────────────────── */

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="hrm-scope pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>,
    document.body,
  );
}

/* ─── visual ────────────────────────────────────────────────── */

interface VariantStyle {
  ring: string;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
}

const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
  success: {
    ring: "ring-success/20",
    iconBg: "bg-success-soft",
    iconColor: "text-success",
    icon: <CheckCircle2 size={18} />,
  },
  error: {
    ring: "ring-danger/20",
    iconBg: "bg-danger-soft",
    iconColor: "text-danger",
    icon: <AlertCircle size={18} />,
  },
  warning: {
    ring: "ring-warning/20",
    iconBg: "bg-warning-soft",
    iconColor: "text-warning",
    icon: <AlertTriangle size={18} />,
  },
  info: {
    ring: "ring-info/20",
    iconBg: "bg-info-soft",
    iconColor: "text-info",
    icon: <Info size={18} />,
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const s = VARIANT_STYLES[toast.variant];
  return (
    <div
      role="status"
      className={`mbg-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-lg ring-1 ${s.ring}`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.iconBg} ${s.iconColor}`}
      >
        {s.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-card-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X size={14} />
      </button>
    </div>
  );
}
