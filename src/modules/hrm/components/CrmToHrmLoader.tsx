import React, { useEffect, useState, useRef } from "react";
import {
  ShieldCheck,
  Loader2,
  Lock,
  Wifi,
  Check,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  LogIn,
} from "lucide-react";
import "./CrmToHrmLoader.css";

export interface CrmToHrmLoaderProps {
  /** If connection or authentication is currently in progress */
  isLoading?: boolean;
  /** If authentication has successfully completed */
  isSuccess?: boolean;
  /** If the HRM backend service is offline, down, or unreachable */
  error?: string | null;
  /** Callback for 'Back to Login' - routes to CRM /login */
  onBackToLogin?: () => void;
  /** Callback for 'Login Again' - retries connecting to HRM */
  onLoginAgain?: () => void;
  /** Callback for 'Login with HRM' - routes to /hrm/login */
  onLoginWithHrm?: () => void;
  /** Custom title override */
  titleOverride?: string;
  /** Custom subtitle override */
  subtitleOverride?: string;
}

const DEFAULT_STEPS = [
  {
    title: "Establishing secure connection...",
    detail: "Initializing authentication request",
  },
  {
    title: "Sending secure request...",
    detail: "Communicating with external application",
  },
  {
    title: "Verifying your identity...",
    detail: "Checking authentication credentials",
  },
  {
    title: "Checking permissions...",
    detail: "Confirming requested access",
  },
  {
    title: "Almost there...",
    detail: "Waiting for authorization response",
  },
  {
    title: "Finalizing secure session...",
    detail: "Preparing your authorized access",
  },
];

export const CrmToHrmLoader: React.FC<CrmToHrmLoaderProps> = ({
  isLoading = true,
  isSuccess = false,
  error = null,
  onBackToLogin,
  onLoginAgain,
  onLoginWithHrm,
  titleOverride,
  subtitleOverride,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cycling status animation from crmTohrm.html
  useEffect(() => {
    if (error || isSuccess) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setFadeOpacity(0);
      setTimeout(() => {
        setCurrentStepIndex((prev) => (prev + 1) % DEFAULT_STEPS.length);
        setFadeOpacity(1);
      }, 180);
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [error, isSuccess]);

  const activeStep = DEFAULT_STEPS[currentStepIndex];

  return (
    <div className="crm-hrm-root">
      <div className="scene">
        {/* SKY GLOW */}
        <div className="sky-glow"></div>
        <div className="horizon-glow"></div>

        {/* SUN */}
        <div className="sun"></div>

        {/* CLOUDS */}
        <div className="cloud one"></div>
        <div className="cloud two"></div>
        <div className="cloud three"></div>

        {/* MOUNTAINS */}
        <div className="mountains">
          <div className="mountain one"></div>
          <div className="mountain two"></div>
          <div className="mountain three"></div>
        </div>

        {/* TREES */}
        <div className="background-trees">
          <div className="tree"></div>
          <div className="tree"></div>
          <div className="tree"></div>
          <div className="tree"></div>
          <div className="tree"></div>
          <div className="tree"></div>
          <div className="tree"></div>
        </div>

        {/* ROAD */}
        <div className="road">
          <div className="road-center"></div>
        </div>

        <div className="grass"></div>

        {/* FLOATING PARTICLES */}
        <div className="particles">
          <span className="particle p1"></span>
          <span className="particle p2"></span>
          <span className="particle p3"></span>
          <span className="particle p4"></span>
          <span className="particle p5"></span>
          <span className="particle p6"></span>
        </div>

        {/* ANIMATED CHARACTERS */}
        <div className="characters">
          {/* LION ON BICYCLE */}
          <div className="lion">
            <div className="lion-tail"></div>
            <div className="lion-body"></div>
            <div className="lion-mane"></div>
            <div className="lion-face">
              <div className="lion-eye one"></div>
              <div className="lion-eye two"></div>
              <div className="lion-nose"></div>
            </div>
            <div className="lion-ear one"></div>
            <div className="lion-ear two"></div>

            <div className="bicycle">
              <div className="wheel back"></div>
              <div className="wheel front"></div>
              <div className="frame"></div>
              <div className="handle"></div>
            </div>

            <div className="pedal-leg one"></div>
            <div className="pedal-leg two"></div>
          </div>

          {/* RUNNERS */}
          <div className="runner r1">
            <div className="runner-head"></div>
            <div className="runner-body"></div>
            <div className="runner-arm left"></div>
            <div className="runner-arm right"></div>
            <div className="runner-leg left"></div>
            <div className="runner-leg right"></div>
          </div>

          <div className="runner r2">
            <div className="runner-head"></div>
            <div className="runner-body"></div>
            <div className="runner-arm left"></div>
            <div className="runner-arm right"></div>
            <div className="runner-leg left"></div>
            <div className="runner-leg right"></div>
          </div>

          <div className="runner r3">
            <div className="runner-head"></div>
            <div className="runner-body"></div>
            <div className="runner-arm left"></div>
            <div className="runner-arm right"></div>
            <div className="runner-leg left"></div>
            <div className="runner-leg right"></div>
          </div>

          <div className="runner r4">
            <div className="runner-head"></div>
            <div className="runner-body"></div>
            <div className="runner-arm left"></div>
            <div className="runner-arm right"></div>
            <div className="runner-leg left"></div>
            <div className="runner-leg right"></div>
          </div>
        </div>

        {/* SPEED LINES */}
        <div className="speed one"></div>
        <div className="speed two"></div>
        <div className="speed three"></div>

        {/* AUTHENTICATION UI CARD */}
        <div className="interface">
          <div
            className="security-icon"
            style={error ? { borderColor: "rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.18)" } : undefined}
          >
            {error ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-sky-300" />
            )}
          </div>

          <div className={`badge ${error ? "error" : ""}`}>
            <span className={`badge-dot ${error ? "error" : ""}`}></span>
            {error ? "Service Offline" : isSuccess ? "Access Verified" : "Secure Authentication"}
          </div>

          <h1>
            {titleOverride || (error ? (
              "HRM Service Unavailable"
            ) : isSuccess ? (
              "Access Granted!"
            ) : (
              "Connecting to HRM Management"
            ))}
          </h1>

          <div className="subtitle">
            {subtitleOverride || (error ? (
              "Please check connection and retry or sign in directly."
            ) : isSuccess ? (
              "Your secure session is verified. Opening HRM dashboard..."
            ) : (
              "Please wait while we securely verify your access"
            ))}
          </div>

          {/* STATUS BOX */}
          <div className={`status-box ${error ? "error" : ""}`}>
            <div className="status-row">
              {error ? (
                <AlertCircle className="status-icon error" />
              ) : isSuccess ? (
                <ShieldCheck className="status-icon" style={{ color: "#4ade80" }} />
              ) : (
                <Loader2 className="status-icon animate-spin" />
              )}

              <div
                className="status-title crm-hrm-fade"
                style={{ opacity: fadeOpacity }}
              >
                {error
                  ? "Connection couldn't be established"
                  : isSuccess
                  ? "Access granted!"
                  : activeStep.title}
              </div>
            </div>

            <div
              className="status-detail crm-hrm-fade"
              style={{ opacity: fadeOpacity }}
            >
              {error
                ? error || "Unable to reach the HRM server. Please verify if the HRM service is running."
                : isSuccess
                ? "Your secure session is ready"
                : activeStep.detail}
            </div>
          </div>

          {/* PROGRESS BAR */}
          {!error && (
            <div className="progress">
              <div
                className="progress-bar"
                style={isSuccess ? { width: "100%", left: "0%", background: "#4ade80" } : undefined}
              ></div>
            </div>
          )}

          {/* CONNECTION STATUS PILLS */}
          <div className="connection-status">
            <div className="connection-item">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Encrypted
            </div>
            <div className="connection-item">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Protected
            </div>
            <div className="connection-item">
              <Wifi
                className={`w-3.5 h-3.5 ${error ? "text-rose-400" : "text-emerald-400"}`}
              />
              {error ? "Disconnected" : "Connected"}
            </div>
          </div>

          {/* ACTIONS: BACK TO LOGIN, LOGIN AGAIN, LOGIN WITH HRM (Only shown when service is down/offline) */}
          {Boolean(error) && !isSuccess && (onBackToLogin || onLoginAgain || onLoginWithHrm) && (
            <div className="hrm-actions">
              {onBackToLogin && (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="hrm-btn hrm-btn-back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </button>
              )}

              {onLoginAgain && (
                <button
                  type="button"
                  onClick={onLoginAgain}
                  className="hrm-btn hrm-btn-retry"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Login Again
                </button>
              )}

              {onLoginWithHrm && (
                <button
                  type="button"
                  onClick={onLoginWithHrm}
                  className="hrm-btn hrm-btn-hrm-login"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login with HRM
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUCCESS MODAL OVERLAY */}
      <div className={`success ${isSuccess ? "show" : ""}`}>
        <div className="success-icon">
          <Check className="w-10 h-10" />
        </div>
        <div className="success-text">Access Granted</div>
      </div>
    </div>
  );
};

export default CrmToHrmLoader;
