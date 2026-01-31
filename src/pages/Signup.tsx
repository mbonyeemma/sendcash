import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Home, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, profileApi } from "@/services/api";
import { OTPVerification } from "@/components/auth/OTPVerification";
import sendicashLogo from "@/assets/sendicash-logo.png";

const getPasswordStrength = (password: string): { strength: "weak" | "medium" | "strong"; score: number; feedback: string } => {
  let score = 0;
  let feedback = "";

  if (password.length >= 8) score += 1;
  else feedback = "At least 8 characters";

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else if (!feedback) feedback = "Mix of uppercase and lowercase";

  if (/\d/.test(password)) score += 1;
  else if (!feedback) feedback = "Add numbers";

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else if (!feedback) feedback = "Add special characters";

  if (score <= 1) return { strength: "weak", score, feedback: feedback || "Very weak password" };
  if (score <= 2) return { strength: "medium", score, feedback: feedback || "Medium strength" };
  return { strength: "strong", score, feedback: "Strong password" };
};

export default function Signup() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showOTP, setShowOTP] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    country: "",
  });
  const [countries, setCountries] = useState<Array<{ country_id: number; name: string; has_payouts: string; status: string }>>([]);

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await profileApi.getCountries();
        // Handle nested response structure: response.data.data contains the array
        if (response.data?.data && Array.isArray(response.data.data)) {
          setCountries(response.data.data);
        } else if (Array.isArray(response.data)) {
          setCountries(response.data);
        } else {
          setCountries([]);
        }
      } catch (error) {
        console.error("Failed to fetch countries:", error);
        // Set empty array on error to prevent map error
        setCountries([]);
      }
    };
    fetchCountries();
  }, []);

  // Redirect if already logged in
  if (isLoggedIn) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // PhoneInput component handles formatting, just check if it's not empty
    return phone.length > 0;
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "email":
        if (!value) return "Email is required";
        if (!validateEmail(value)) return "Please enter a valid email address";
        return "";
      case "phone":
        // Phone is optional, but if provided, it must have some value
        // PhoneInput component handles validation
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return "";
      case "name":
        if (!value) return "Full name is required";
        if (value.length < 2) return "Name must be at least 2 characters";
        return "";
      case "country":
        if (!value) return "Country is required";
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

  const handlePhoneChange = (value: string | undefined) => {
    setFormData({ ...formData, phone: value || "" });
    if (touched.phone) {
      const error = validateField("phone", value || "");
      setErrors({ ...errors, phone: error });
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
    
    // Mark all fields as touched (phone is optional)
    const allTouched = { name: true, email: true, phone: !!formData.phone, password: true, country: true };
    setTouched(allTouched);

    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare registration data matching API interface
      const registerData: {
        full_name: string;
        email: string;
        password: string;
        phone_number?: string;
        country_code?: string;
        confirm_password?: string;
        country?: string;
      } = {
        full_name: formData.name,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.password,
        country: formData.country || undefined,
      };

      // Add phone_number and country_code only if phone is provided
      if (formData.phone) {
        // PhoneInput component returns formatted phone with country code
        const phoneNumber = formData.phone.replace(/\s/g, "");
        registerData.phone_number = phoneNumber;
        // Extract country code from phone number (PhoneInput includes +256 or 256)
        if (phoneNumber.startsWith("+256")) {
          registerData.country_code = "256";
          registerData.phone_number = phoneNumber.replace("+", "");
        } else if (phoneNumber.startsWith("256")) {
          registerData.country_code = "256";
          registerData.phone_number = phoneNumber;
        } else {
          // Default to Uganda if no country code detected
          registerData.country_code = "256";
          registerData.phone_number = phoneNumber;
        }
      }

      const response = await authApi.register(registerData);

      if (response.status === 200) {
        const message = (response as any).message || "";
        const needsVerification = message.toLowerCase().includes("verify") || (response as any).data?.email;
        const email = (response as any).data?.email || formData.email;

        if (needsVerification && email) {
          setRegisteredEmail(email);
          setShowOTP(true);
          toast({ title: "Check your email", description: "Enter the 6-digit code we sent to " + email });
        } else {
          toast.success("Registration successful! Please login to continue.");
          navigate("/login");
        }
      }
    } catch (error: any) {
      // Error toast is already shown by the API layer, so we don't need to show another one
      // Just log for debugging if needed
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-4">
          <Link to="/" className="inline-block">
            <img src={sendicashLogo} alt="SendiCash" className="h-10 mx-auto" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl p-5 border border-border">
          {showOTP ? (
            <OTPVerification
              email={registeredEmail}
              onBack={() => {
                setShowOTP(false);
                setRegisteredEmail("");
              }}
            />
          ) : (
            <>
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Create Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Join SendWave and start sending money
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 bg-transparent border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary ${errors.name ? "border-destructive" : touched.name && !errors.name ? "border-green-500" : "border-border"}`}
                />
                {touched.name && !errors.name && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 bg-transparent border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary ${errors.email ? "border-destructive" : touched.email && !errors.email ? "border-green-500" : "border-border"}`}
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
              <Label htmlFor="phone">Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <PhoneInput
                value={formData.phone}
                onChange={handlePhoneChange}
                onBlur={() => {
                  setTouched({ ...touched, phone: true });
                }}
                error={!!errors.phone}
                className="bg-transparent border-0 border-b-2 rounded-none"
              />
              {errors.phone && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, country: value });
                    if (errors.country) setErrors({ ...errors, country: "" });
                  }}
                >
                  <SelectTrigger className="pl-10 bg-transparent border-0 border-b-2 rounded-none focus:ring-0 focus:ring-offset-0 h-12">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(countries) && countries.length > 0 ? (
                      countries
                        .filter((country) => country.country_id != null && country.country_id !== undefined)
                        .map((country) => {
                          const countryId = String(country.country_id);
                          return (
                            <SelectItem key={countryId} value={countryId}>
                              {country.name || countryId}
                            </SelectItem>
                          );
                        })
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading countries...</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {errors.country && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.country}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 pr-10 bg-transparent border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary ${errors.password ? "border-destructive" : touched.password && !errors.password ? "border-green-500" : "border-border"}`}
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
              {passwordStrength && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength.strength === "weak"
                            ? "bg-red-500 w-1/3"
                            : passwordStrength.strength === "medium"
                            ? "bg-yellow-500 w-2/3"
                            : "bg-green-500 w-full"
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                          passwordStrength.strength === "weak"
                            ? "text-red-500"
                            : passwordStrength.strength === "medium"
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}>
                      {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                    </span>
                  </div>
                  {passwordStrength.strength !== "strong" && (
                    <p className="text-xs text-muted-foreground">{passwordStrength.feedback}</p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social login */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button variant="outline" className="w-full">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </Button>
          </div>

          {/* Switch mode */}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
