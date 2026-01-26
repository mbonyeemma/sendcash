import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Shield, Bell, Camera, CheckCircle, Clock, AlertCircle, Upload, FileText, Loader2, Network, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { profileApi, walletApi, notificationApi, Notification } from "@/services/api";
import { xrplService } from "@/services/xrplService";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { OfframpModal } from "@/components/dashboard/OfframpModal";

type SettingsTab = "profile" | "security" | "notifications" | "offramp" | "kyc" | "network";

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
          <TabsList className="grid grid-cols-6 w-full h-auto bg-transparent gap-2">
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
              value="network"
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Network className="w-4 h-4" />
              <span className="font-medium">Network</span>
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

          <TabsContent value="network" className="mt-0">
            <NetworkContent />
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

// Network Content Component
const NetworkContent = () => {
  const { isConnected, address, network, switchToTestnet, switchToMainnet } = useXRPLWallet();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCreatingTrustline, setIsCreatingTrustline] = useState(false);

  const handleRequestTestXRP = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (network !== "Testnet") {
      toast.error("Please switch to Testnet to request test funds");
      return;
    }

    try {
      setIsRequesting(true);
      await xrplService.requestTestXRP(address);
      toast.success("Test XRP requested successfully! It may take a few moments to arrive.");
    } catch (error: any) {
      console.error("Failed to request test XRP:", error);
      toast.error("Failed to request test XRP. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSetupRLUSDTrustline = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (network !== "Testnet") {
      toast.error("Please switch to Testnet to setup RLUSD");
      return;
    }

    try {
      setIsCreatingTrustline(true);
      const issuer = xrplService.getRLUSDIssuer("Testnet");
      await xrplService.setTrustline("RLUSD", issuer, "1000000");
      toast.success("RLUSD trustline created! You can now receive RLUSD.");
    } catch (error: any) {
      console.error("Failed to create trustline:", error);
      toast.error(error.message || "Failed to create trustline. Please try again.");
    } finally {
      setIsCreatingTrustline(false);
    }
  };

  const handleOpenRLUSDFaucet = () => {
    window.open(xrplService.getRLUSDFaucetURL(), "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">XRPL Network Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your XRPL network and manage test funds
        </p>
      </div>

      {/* Wallet Status */}
      <div className={`p-4 rounded-xl border ${isConnected ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"}`}>
        <div className="flex items-start gap-3">
          <Wallet className={`w-5 h-5 shrink-0 mt-0.5 ${isConnected ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`} />
          <div>
            <p className={`text-sm font-medium ${isConnected ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200"}`}>
              {isConnected ? "Wallet Connected" : "Wallet Not Connected"}
            </p>
            {isConnected && address && (
              <p className={`text-xs mt-1 ${isConnected ? "text-green-700 dark:text-green-300" : "text-yellow-700 dark:text-yellow-300"}`}>
                {address.slice(0, 8)}...{address.slice(-6)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Network Selection */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">Network</h3>
          <p className="text-xs text-muted-foreground">
            Current network: <span className="font-medium text-foreground">{network || "Not connected"}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={switchToMainnet}
            className={`p-4 rounded-xl border transition-all ${
              network === "Mainnet"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted hover:bg-muted/80 border-border"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <Network className="w-6 h-6" />
              <div>
                <p className="font-semibold">Mainnet</p>
                <p className="text-xs opacity-80">Production network</p>
              </div>
            </div>
          </button>

          <button
            onClick={switchToTestnet}
            className={`p-4 rounded-xl border transition-all ${
              network === "Testnet"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted hover:bg-muted/80 border-border"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <Network className="w-6 h-6" />
              <div>
                <p className="font-semibold">Testnet</p>
                <p className="text-xs opacity-80">Testing network</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Test Faucet */}
      {network === "Testnet" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Test Faucet</h3>
            <p className="text-sm text-muted-foreground">
              Get free test XRP and RLUSD for testing
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Testnet Funds</p>
                <p className="text-xs text-muted-foreground mt-1">
                  These funds have no real value and are only for testing purposes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRequestTestXRP}
              disabled={!isConnected || isRequesting}
              variant="outline"
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Requesting XRP...
                </>
              ) : (
                "1. Request Test XRP"
              )}
            </Button>

            <Button
              onClick={handleSetupRLUSDTrustline}
              disabled={!isConnected || isCreatingTrustline}
              variant="outline"
              className="w-full"
            >
              {isCreatingTrustline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Trustline...
                </>
              ) : (
                "2. Setup RLUSD Trustline"
              )}
            </Button>

            <Button
              onClick={handleOpenRLUSDFaucet}
              disabled={!isConnected}
              className="w-full"
            >
              3. Get Test RLUSD from Faucet
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Step 1:</strong> Get XRP for transaction fees</p>
            <p>• <strong>Step 2:</strong> Create trustline to receive RLUSD</p>
            <p>• <strong>Step 3:</strong> Get RLUSD from tryrlusd.com (requires GitHub login)</p>
          </div>
        </div>
      )}
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