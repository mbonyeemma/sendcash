import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { authApi } from "@/services/api";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the email field (e.g. from the login form). */
  defaultEmail?: string;
  /** Called after a successful reset, with the email that was reset. */
  onSuccess?: (email: string) => void;
}

type Step = "email" | "reset";

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const ForgotPasswordModal = ({
  open,
  onOpenChange,
  defaultEmail = "",
  onSuccess,
}: ForgotPasswordModalProps) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");

  // Reset internal state whenever the modal opens
  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail(defaultEmail);
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError("");
    }
  }, [open, defaultEmail]);

  const requestCode = async () => {
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      toast.success("Reset code sent", { description: `Check ${email} for the 6-digit code.` });
      setStep("reset");
    } catch (err: any) {
      // api layer already surfaces a toast; keep an inline hint too
      setError(err?.message || "Could not send reset code. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setIsResending(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      toast.success("Reset code sent", { description: `Check ${email} for the 6-digit code.` });
    } catch (err: any) {
      setError(err?.message || "Could not resend code. Try again.");
    } finally {
      setIsResending(false);
    }
  };

  const submitReset = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      // 1. Confirm the code is valid, then 2. set the new password.
      await authApi.verifyResetOTP(email, otp);
      await authApi.resetPassword(email, password);
      toast.success("Password reset", { description: "You can now sign in with your new password." });
      onSuccess?.(email);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Could not reset password. Check the code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            {step === "email" ? (
              <Mail className="w-7 h-7 text-primary" />
            ) : (
              <KeyRound className="w-7 h-7 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">
            {step === "email" ? "Reset your password" : "Enter code & new password"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "email"
              ? "We'll email you a 6-digit code to reset your password."
              : `Enter the code sent to ${email} and choose a new password.`}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              requestCode();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="fp-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sending code...
                </>
              ) : (
                "Send reset code"
              )}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitReset();
            }}
          >
            <div>
              <Label className="text-sm font-medium mb-2 block text-center">Verification code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError("");
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fp-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fp-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fp-confirm">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fp-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Change email
              </button>
              <button
                type="button"
                onClick={resendCode}
                disabled={isResending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {isResending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
