import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { authApi, profileApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface OTPVerificationProps {
  email: string;
  onBack: () => void;
}

export const OTPVerification = ({ email, onBack }: OTPVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string>("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrors("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setErrors("");

    try {
      const response = await authApi.verifyOTP({ email, otp });
      
      if (response.data) {
        // OTP verification might not return all user fields, so we merge with defaults
        const userData = {
          ...response.data.user,
          // Set defaults if missing
          currency: response.data.user.currency || "UGX",
          country: response.data.user.country || "",
          country_code: response.data.user.country_code || "",
          full_name: response.data.user.full_name || response.data.user.username || "",
          phone_number: response.data.user.phone_number || "",
          has_wallet_pin: response.data.user.has_wallet_pin || false,
        };
        
        login(userData, response.data.token);
        toast.success("Email verified! Your account has been successfully verified.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      setErrors(error.message || "Invalid OTP. Please try again.");
      toast.error(error.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="bg-card rounded-2xl shadow-xl p-6 border border-border">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Verify Your Email
          </h2>
          <p className="text-muted-foreground">
            We've sent a 6-digit code to
          </p>
          <p className="font-medium text-foreground mt-1">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block text-center">
              Enter Verification Code
            </Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setErrors("");
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
            {errors && (
              <p className="text-sm text-destructive flex items-center gap-1 mt-2 justify-center">
                <AlertCircle className="w-4 h-4" />
                {errors}
              </p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            className="w-full h-12"
            disabled={otp.length !== 6 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign Up
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button
              onClick={() => {
                toast.info("Resend Code: Please check your email for the verification code.");
              }}
              className="text-primary hover:underline"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
