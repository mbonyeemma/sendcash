import { motion } from "framer-motion";
import { Shield, CheckCircle, Clock, AlertCircle, Upload, Camera, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type VerificationStatus = "pending" | "verified" | "unverified";

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: VerificationStatus;
  icon: typeof FileText;
}

const verificationSteps: VerificationStep[] = [
  {
    id: "email",
    title: "Email Verification",
    description: "Verify your email address",
    status: "verified",
    icon: CheckCircle,
  },
  {
    id: "phone",
    title: "Phone Verification",
    description: "Verify your phone number",
    status: "verified",
    icon: CheckCircle,
  },
  {
    id: "id",
    title: "ID Document",
    description: "Upload a valid government-issued ID",
    status: "pending",
    icon: FileText,
  },
  {
    id: "selfie",
    title: "Selfie Verification",
    description: "Take a selfie for identity verification",
    status: "unverified",
    icon: Camera,
  },
];

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

export const KYCView = () => {
  const completedSteps = verificationSteps.filter((s) => s.status === "verified").length;
  const progress = (completedSteps / verificationSteps.length) * 100;

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
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                      Verified
                    </span>
                  )}
                  {step.status === "pending" && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                      Under Review
                    </span>
                  )}
                  {step.status === "unverified" && (
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

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