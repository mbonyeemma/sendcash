import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Shield, Bell, Camera, CheckCircle, Clock, AlertCircle, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { profileApi, walletApi, notificationApi, Notification } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { OfframpModal } from "@/components/dashboard/OfframpModal";

type SettingsTab = "profile" | "security" | "notifications" | "offramp" | "kyc";

export const SettingsView = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    country: "",
    avatar: "",
  });

  // Security form state
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    transactionPin: "",
    confirmTransactionPin: "",
  });

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotifications();
    }
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await notificationApi.getNotifications();
      if (response.data) {
        setNotifications(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      const response = await profileApi.updateProfile({
        full_name: profileData.full_name,
        phone_number: profileData.phone_number,
        country: profileData.country,
        avatar: profileData.avatar,
      });

      if (response.status === 200) {
        // Update user in context
        if (user) {
          refreshUser({
            ...user,
            full_name: profileData.full_name,
            phone_number: profileData.phone_number,
          });
        }
        toast.success("Your profile has been updated successfully.");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      // Note: The API might need currentPassword, but the endpoint structure suggests it might be different
      // Adjust based on actual API requirements
      const response = await profileApi.changePin(
        securityData.currentPassword,
        securityData.confirmPassword,
        securityData.newPassword
      );

      if (response.status === 200) {
        toast({
          title: "Password updated",
          description: "Your password has been updated successfully.",
        });
        setSecurityData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          transactionPin: "",
          confirmTransactionPin: "",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetTransactionPin = async () => {
    if (securityData.transactionPin !== securityData.confirmTransactionPin) {
      toast.error("PINs do not match");
      return;
    }

    if (securityData.transactionPin.length < 4) {
      toast({
        title: "Error",
        description: "PIN must be at least 4 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await walletApi.setTransactionPin({
        pin: securityData.transactionPin,
        confirm_pin: securityData.confirmTransactionPin,
      });

      if (response.status === 200) {
        toast.success("Your transaction PIN has been set successfully.");
        setSecurityData({
          ...securityData,
          transactionPin: "",
          confirmTransactionPin: "",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to set transaction PIN");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)} className="w-full">
        {/* Horizontal Tabs Menu */}
        <div className="bg-card rounded-2xl border border-border p-2 mb-4">
          <TabsList className="grid grid-cols-5 w-full h-auto bg-transparent gap-2">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <User className="w-4 h-4" />
              <span className="font-medium">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security"
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Lock className="w-4 h-4" />
              <span className="font-medium">Security</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Bell className="w-4 h-4" />
              <span className="font-medium">Notifications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="kyc"
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Shield className="w-4 h-4" />
              <span className="font-medium">KYC</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <TabsContent value="profile" className="mt-0">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                    <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Profile Photo</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG. Max 2MB</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      value={profileData.email}
                      disabled
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={profileData.country}
                      onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>

                <div className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                      placeholder="••••••••"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                      placeholder="••••••••"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="mt-1.5"
                    />
                  </div>
                </div>

              <Button onClick={handleUpdatePassword} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>

              <div className="border-t border-border pt-6">
                <h3 className="text-base font-semibold text-foreground mb-4">Transaction PIN</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Transaction PIN</Label>
                    <Input
                      type="password"
                      value={securityData.transactionPin}
                      onChange={(e) => setSecurityData({ ...securityData, transactionPin: e.target.value })}
                      placeholder="Enter 4-6 digit PIN"
                      className="mt-1.5"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>Confirm Transaction PIN</Label>
                    <Input
                      type="password"
                      value={securityData.confirmTransactionPin}
                      onChange={(e) => setSecurityData({ ...securityData, confirmTransactionPin: e.target.value })}
                      placeholder="Confirm PIN"
                      className="mt-1.5"
                      maxLength={6}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSetTransactionPin}
                  disabled={isLoading}
                  variant="outline"
                  className="mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Setting...
                    </>
                  ) : (
                    "Set Transaction PIN"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="offramp" className="mt-0">
            <OfframpContent />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>

              {isLoadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl border ${
                        notification.read ? "bg-muted/50 border-border" : "bg-primary/5 border-primary/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary ml-2"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="mt-0">
            <KYCContent />
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
};

// Offramp Content Component
const OfframpContent = () => {
  const [offrampModalOpen, setOfframpModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Offramp Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your wallet addresses and set up automatic offramp conversions
          </p>
        </div>
        <Button onClick={() => setOfframpModalOpen(true)}>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      </div>

      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">How Offramp Works</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Connect your external wallet address (MetaMask, Trust Wallet, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>When you send crypto to your connected wallet address, it automatically gets converted to fiat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>The converted amount is immediately paid out to your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>You can manage multiple wallet addresses and set different conversion preferences</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {offrampModalOpen && (
        <OfframpModal
          isOpen={offrampModalOpen}
          onClose={() => setOfframpModalOpen(false)}
          onSuccess={() => setOfframpModalOpen(false)}
        />
      )}
    </div>
  );
};

// KYC Content Component
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

const KYCContent = () => {
  const completedSteps = verificationSteps.filter((s) => s.status === "verified").length;
  const progress = (completedSteps / verificationSteps.length) * 100;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">KYC Verification</h2>
      <p className="text-muted-foreground">Complete verification to unlock all features</p>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted/50 rounded-xl border border-border p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Verification Progress</h3>
            <p className="text-sm text-muted-foreground">{completedSteps} of {verificationSteps.length} steps completed</p>
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
              className="bg-muted/50 rounded-xl border border-border p-4"
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
        className="bg-primary/5 rounded-xl border border-primary/20 p-6"
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