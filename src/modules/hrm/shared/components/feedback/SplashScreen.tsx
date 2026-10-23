import { Loader2 } from "lucide-react";

export interface SplashScreenProps {
  message?: string;
}

/**
 * Full-page loading state. Shown while AuthBootstrap is calling /auth/me
 * on first paint and while role guards resolve.
 */
export function SplashScreen({ message }: SplashScreenProps) {
  return (
    <div className="grid min-h-screen w-full place-items-center bg-slate-50 text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        {message ? <p className="text-sm">{message}</p> : null}
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}

export default SplashScreen;
