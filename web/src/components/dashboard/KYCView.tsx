import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, Clock, AlertCircle, Upload, Camera, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { kycApi, type KycStatusResponse } from "@/services/api";

type VerificationStatus = "pending" | "verified" | "unverified";

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: VerificationStatus;
  icon: typeof FileText;
  canUpload?: boolean;
}

const statusIcons = {
  verified: CheckCircle,
  pending: Clock,
  unverified: AlertCircle,
};

const statusColors = {
  verified: "text-emerald-500 bg-emerald-500/10",
  pending: "text-amber-500 bg-amber-500/10",
  unverified: "text-muted-foreground bg-muted",
};

const statusLabels = {
  verified: "Verified",
  pending: "Under Review",
  unverified: "Not Started",
};

export const KYCView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      setIsLoading(true);
      const response = await kycApi.getKycStatus();
      if (response.data) {
        setKycStatus(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch KYC status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildSteps = (): VerificationStep[] => {
    if (!kycStatus) {
      return [
        { id: "email", title: "Email Verification", description: "Verify your email address", status: "unverified", icon: CheckCircle },
        { id: "phone", title: "Phone Verification", description: "Verify your phone number", status: "unverified", icon: CheckCircle },
        { id: "id", title: "ID Document", description: "Upload a valid government-issued ID", status: "unverified", icon: FileText, canUpload: true },
        { id: "selfie", title: "Selfie Verification", description: "Take a selfie for identity verification", status: "unverified", icon: Camera, canUpload: true },
      ];
    }
    return [
      { id: "email", title: "Email Verification", description: kycStatus.email.value ? `Verified: ${kycStatus.email.value}` : "Verify your email address", status: kycStatus.email.status, icon: CheckCircle },
      { id: "phone", title: "Phone Verification", description: kycStatus.phone.value ? `Phone: ${kycStatus.phone.value}` : "Verify your phone number", status: kycStatus.phone.status, icon: CheckCircle },
      { id: "id", title: "ID Document", description: "Upload a valid government-issued ID", status: kycStatus.id_document.status, icon: FileText, canUpload: true },
      { id: "selfie", title: "Selfie Verification", description: "Take a selfie for identity verification", status: kycStatus.selfie.status, icon: Camera, canUpload: true },
    ];
  };

  const verificationSteps = buildSteps();
  const completedSteps = verificationSteps.filter((s) => s.status === "verified").length;
  const progress = (completedSteps / verificationSteps.length) * 100;

  const handleFileSelect = (stepId: string) => {
    if (stepId === "selfie" && selfieInputRef.current) {
      selfieInputRef.current.click();
    } else if (stepId === "id" && idInputRef.current) {
      idInputRef.current.click();
    }
  };

  const handleFileChange = (stepId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG)");
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    // TODO: Upload to backend once file upload endpoint is available
    toast.info(`${stepId === "selfie" ? "Selfie" : "ID document"} selected: ${file.name}. Upload endpoint coming soon.`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">KYC Verification</h1>
        <p className="text-muted-foreground">Complete verification to unlock all features</p>
      </div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Verification Progress</h2>
            <p className="text-muted-foreground">{completedSteps} of {verificationSteps.length} steps completed</p>
          </div>
          <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
          />
        </div>
      </motion.div>

      {/* Verification Steps */}
      <div className="space-y-4">
        {verificationSteps.map((step, index) => {
          const StatusIcon = statusIcons[step.status];
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border p-6"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusColors[step.status]}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                <div>
                  {step.status === "verified" && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-sm font-medium">
                      {statusLabels.verified}
                    </span>
                  )}
                  {step.status === "pending" && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-sm font-medium">
                      {statusLabels.pending}
                    </span>
                  )}
                  {step.status === "unverified" && step.canUpload && (
                    <Button variant="outline" size="sm" onClick={() => handleFileSelect(step.id)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  )}
                  {step.status === "unverified" && !step.canUpload && (
                    <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                      {statusLabels.unverified}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={selfieInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFileChange("selfie", e)}
      />
      <input
        ref={idInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => handleFileChange("id", e)}
      />

      {/* Benefits Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-primary/5 rounded-2xl border border-primary/20 p-6"
      >
        <h3 className="font-semibold text-foreground mb-3">Benefits of Full Verification</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Higher transaction limits
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Access to all crypto features
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Priority customer support
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Lower transaction fees
          </li>
        </ul>
      </motion.div>
    </div>
  );
};
