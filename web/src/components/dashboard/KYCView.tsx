import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, Clock, AlertCircle, Upload, Camera, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { kycApi, type KycStatusResponse } from "@/services/api";

type VerificationStatus = "pending" | "verified" | "unverified";

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

const ID_DOCUMENT_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "voters_card", label: "Voter's Card" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const KYCView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      setIsLoading(true);
      const response = await kycApi.getKycStatus();
      if (response.data) setKycStatus(response.data);
    } catch (error: any) {
      console.error("Failed to fetch KYC status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const overall = kycStatus?.overall_status ?? "unverified";
  const emailStatus: VerificationStatus = kycStatus?.email.status ?? "unverified";
  const phoneStatus: VerificationStatus = kycStatus?.phone.status ?? "unverified";

  const handleFileChange = async (which: "id" | "selfie", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG)");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (which === "id") setIdImage(dataUrl);
      else setSelfieImage(dataUrl);
    } catch {
      toast.error("Could not read the selected file. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!idImage || !selfieImage) {
      toast.error("Please upload both your ID document and a selfie.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await kycApi.submitKyc({
        id_document_type: idType,
        id_number: idNumber || undefined,
        id_document_image: idImage,
        selfie_image: selfieImage,
      });
      if (res.status === 200) {
        toast.success("Documents submitted. We'll review them shortly.");
        setIdImage(null);
        setSelfieImage(null);
        setIdNumber("");
        await fetchKycStatus();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit documents.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Progress: email, phone, documents (id + selfie share one manual review)
  const checks = [emailStatus === "verified", phoneStatus === "verified", overall === "verified"];
  const completedSteps = checks.filter(Boolean).length;
  const progress = (completedSteps / checks.length) * 100;

  const showUploadForm = overall === "unverified" || overall === "rejected";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">KYC Verification</h1>
        <p className="text-muted-foreground">Complete verification to unlock all features</p>
      </div>

      {/* Status banners */}
      {overall === "pending" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">Your documents are under review</p>
            <p className="text-sm text-muted-foreground">This usually takes up to 24 hours. We'll notify you once it's done.</p>
          </div>
        </div>
      )}
      {overall === "verified" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-500" />
          <div>
            <p className="font-medium text-foreground">You're verified</p>
            <p className="text-sm text-muted-foreground">Your identity has been confirmed. All features are unlocked.</p>
          </div>
        </div>
      )}
      {overall === "rejected" && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-foreground">Verification was rejected</p>
            <p className="text-sm text-muted-foreground">
              {kycStatus?.rejection_reason || "Please re-upload clearer documents."}
            </p>
          </div>
        </div>
      )}

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
            <p className="text-muted-foreground">{completedSteps} of {checks.length} steps completed</p>
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

      {/* Email & phone steps (read-only) */}
      <div className="space-y-4">
        {[
          { id: "email", title: "Email Verification", desc: kycStatus?.email.value ? `Verified: ${kycStatus.email.value}` : "Verify your email address", status: emailStatus },
          { id: "phone", title: "Phone Verification", desc: kycStatus?.phone.value ? `Phone: ${kycStatus.phone.value}` : "Verify your phone number", status: phoneStatus },
        ].map((step) => {
          const StatusIcon = statusIcons[step.status];
          return (
            <div key={step.id} className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusColors[step.status]}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${step.status === "verified" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                  {step.status === "verified" ? "Verified" : "Not Started"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Document upload form */}
      {showUploadForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-5"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Identity Documents</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Document type</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                {ID_DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Document number (optional)</label>
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. CM1234567890"
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <UploadTile
              title="ID document"
              hint="Front of your government-issued ID"
              icon={FileText}
              image={idImage}
              onPick={() => idInputRef.current?.click()}
              onClear={() => setIdImage(null)}
            />
            <UploadTile
              title="Selfie"
              hint="A clear photo of your face"
              icon={Camera}
              image={selfieImage}
              onPick={() => selfieInputRef.current?.click()}
              onClear={() => setSelfieImage(null)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !idImage || !selfieImage} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {overall === "rejected" ? "Re-submit for review" : "Submit for review"}
          </Button>
        </motion.div>
      )}

      {/* Hidden file inputs */}
      <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFileChange("selfie", e)} />
      <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange("id", e)} />

      {/* Benefits Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-primary/5 rounded-2xl border border-primary/20 p-6"
      >
        <h3 className="font-semibold text-foreground mb-3">Benefits of Full Verification</h3>
        <ul className="space-y-2 text-muted-foreground">
          {["Higher transaction limits", "Access to all crypto features", "Priority customer support", "Lower transaction fees"].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {b}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
};

function UploadTile({
  title,
  hint,
  icon: Icon,
  image,
  onPick,
  onClear,
}: {
  title: string;
  hint: string;
  icon: typeof FileText;
  image: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {image && (
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground" aria-label="Remove">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {image ? (
        <button onClick={onPick} className="block w-full">
          <img src={image} alt={title} className="h-36 w-full rounded-lg object-cover" />
          <span className="mt-2 block text-xs text-muted-foreground">Tap to replace</span>
        </button>
      ) : (
        <button
          onClick={onPick}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
        >
          <Icon className="h-6 w-6" />
          <span className="text-xs">{hint}</span>
          <span className="text-xs font-medium text-primary">Upload</span>
        </button>
      )}
    </div>
  );
}
