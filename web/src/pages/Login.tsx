import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/api";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import sendicashLogo from "@/assets/sendicash-logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoggedIn, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [forgotOpen, setForgotOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: searchParams.get("email") || "",
    password: "",
  });

  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate]);

  if (!authLoading && isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "email":
        if (!value) return "Email is required";
        if (!validateEmail(value)) return "Please enter a valid email address";
        return "";
      case "password":
        if (!value) return "Password is required";
        return "";
      default:
        return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({ ...errors, [name]: error });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched = { email: true, password: true };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      sonnerToast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      // Email not verified — send user to signup OTP flow
      if (response.status === 203) {
        sonnerToast.message("Please verify your email to continue", {
          description: "Enter the code we sent you, or request a new one.",
        });
        navigate(`/signup?email=${encodeURIComponent(formData.email)}&verify=1`);
        return;
      }

      const token = response.data?.token;
      const user = response.data?.user;
      if (!token || !user) {
        sonnerToast.error("Login failed. Please try again.");
        return;
      }

      login(user, token);
      sonnerToast.success("Welcome back!", {
        description: "You've successfully logged in.",
      });
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md mx-auto flex flex-col flex-1 justify-center"
      >
        {/* Logo */}
        <div className="text-center mb-4">
          <Link to="/" className="inline-block">
            <img src={sendicashLogo} alt="SendiCash" className="h-10 mx-auto" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl p-5 border border-border">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access your wallet
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="username"
                  className={`pl-10 ${errors.email ? "border-destructive" : touched.email && !errors.email ? "border-green-500" : ""}`}
                />
                {touched.email && !errors.email && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : touched.password && !errors.password ? "border-green-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {touched.password && !errors.password && (
                  <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/tos" className="hover:text-foreground hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </motion.div>

      <ForgotPasswordModal
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultEmail={formData.email}
        onSuccess={(email) => setFormData((prev) => ({ ...prev, email, password: "" }))}
      />
    </div>
  );
}
