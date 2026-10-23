import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import { ROUTES } from "@shared/constants";
import { getApiErrorMessage } from "@shared/lib";

import { Button } from "@hrm/components/ui/button";
import { Dialog } from "@hrm/components/ui/dialog";
import { Input } from "@hrm/components/ui/input";

import { usePasswordReset } from "../hooks";

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordDialog({ open, onClose, initialEmail = "" }: ForgotPasswordDialogProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { forgotPassword } = usePasswordReset();
  const resetForgotPassword = forgotPassword.reset;
  const [email, setEmail] = useState(initialEmail);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setValidationError(null);
    resetForgotPassword();
  }, [open, initialEmail, resetForgotPassword]);

  const close = () => {
    if (forgotPassword.isPending) return;
    forgotPassword.reset();
    onClose();
  };

  const submit = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setValidationError("Please enter your email address.");
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    setValidationError(null);
    forgotPassword.mutate(normalizedEmail, {
      onSuccess: ({ message }) => {
        toast.success("OTP sent", message || "Please check your email for the verification OTP.");
        onClose();
        void navigate(`${ROUTES.resetPassword}?email=${encodeURIComponent(normalizedEmail)}`);
      },
    });
  };

  const apiError = forgotPassword.error ? getApiErrorMessage(forgotPassword.error) : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Reset your password"
      description="Enter your registered email address to continue."
      size="sm"
      closable={!forgotPassword.isPending}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4"
        noValidate
      >
        <div>
          <label htmlFor="forgot-password-email" className="mb-2 block text-sm font-semibold">
            Email address
          </label>
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            maxLength={255}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setValidationError(null);
              if (forgotPassword.error) forgotPassword.reset();
            }}
            disabled={forgotPassword.isPending}
            aria-invalid={Boolean(validationError ?? apiError)}
            aria-describedby={validationError ?? apiError ? "forgot-password-error" : undefined}
            placeholder="you@company.com"
          />
        </div>

        {validationError || apiError ? (
          <p id="forgot-password-error" role="alert" className="text-sm text-danger">
            {validationError ?? apiError}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={close} disabled={forgotPassword.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {forgotPassword.isPending ? "Checking..." : "Continue"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
