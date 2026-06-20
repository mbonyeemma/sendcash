import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Shield, Camera, CheckCircle, Clock, AlertCircle, Upload, FileText, Loader2, Network, Wallet, CreditCard, Plus, Trash2, Smartphone, Building2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { profileApi, walletApi, paymentMethodApi, kycApi, PaymentMethod as ApiPaymentMethod, type KycStatusResponse } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { OfframpModal } from "@/components/dashboard/OfframpModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";

type SettingsTab = "profile" | "security" | "offramp" | "kyc" | "network" | "payment-methods";

export const SettingsView = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    country: user?.country || "",
    avatar: user?.avatar || "",
  });

  // Security form state
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    transactionPin: "",
    confirmTransactionPin: "",
  });


  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [addPaymentMethodOpen, setAddPaymentMethodOpen] = useState(false);
  const [addPmType, setAddPmType] = useState<"MOBILE" | "BANK">("MOBILE");
  const [addPmForm, setAddPmForm] = useState({
    account_name: "",
    phone_number: "",
    country_code: "256",
    network: "MTN",
    bank_name: "",
    account_number: "",
    currency: "UGX",
    address: "",
  });


  useEffect(() => {
    if (activeTab === "payment-methods") {
      fetchPaymentMethods();
    }
  }, [activeTab]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await paymentMethodApi.getUserPaymentMethods();
      if (response.data) setPaymentMethods(response.data);
    } catch (e) {
      console.error("Failed to fetch payment methods:", e);
      toast.error("Failed to load payment methods");
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!addPmForm.account_name.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (addPmType === "MOBILE" && !addPmForm.phone_number.trim()) {
      toast.error("Phone number is required for Mobile Money");
      return;
    }
    if (addPmType === "BANK" && (!addPmForm.account_number.trim() || !addPmForm.bank_name.trim())) {
      toast.error("Bank name and account number are required");
      return;
    }
    try {
      setIsLoading(true);
      const payload: any = {
        type: addPmType,
        currency: addPmForm.currency,
        account_name: addPmForm.account_name.trim(),
      };
      if (addPmForm.address?.trim()) {
        payload.bank_address = addPmForm.address.trim();
      }
      if (addPmType === "MOBILE") {
        // Preserve + (e.g. +256787719618): only strip spaces, not the plus
        payload.phone_number = addPmForm.phone_number.replace(/\s/g, "").trim();
        payload.country_code = addPmForm.country_code;
        payload.network = addPmForm.network;
      } else {
        payload.account_number = addPmForm.account_number.trim();
        payload.bank_name = addPmForm.bank_name.trim();
      }
      const response = await paymentMethodApi.addPaymentMethod(payload);
      if (response.status === 201 || response.status === 200) {
        toast.success("Payment method added");
        setAddPaymentMethodOpen(false);
        setAddPmForm({ account_name: "", phone_number: "", country_code: "256", network: "MTN", bank_name: "", account_number: "", currency: "UGX", address: "" });
        fetchPaymentMethods();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add payment method");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!paymentMethodId) return;
    try {
      setIsLoading(true);
      await paymentMethodApi.deletePaymentMethod(paymentMethodId);
      toast.success("Payment method removed");
      fetchPaymentMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove payment method");
    } finally {
      setIsLoading(false);
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
        // Update user in context including country
        if (user) {
          refreshUser({
            ...user,
            full_name: profileData.full_name,
            phone_number: profileData.phone_number,
            country: profileData.country,
            avatar: profileData.avatar,
          });
        }
        toast.success("Your profile has been updated successfully.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
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
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 w-full h-auto bg-transparent gap-2">
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
              value="kyc"
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Shield className="w-4 h-4" />
              <span className="font-medium">KYC</span>
            </TabsTrigger>
            <TabsTrigger 
              value="payment-methods"
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <CreditCard className="w-4 h-4" />
              <span className="font-medium">Payment methods</span>
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

          <TabsContent value="kyc" className="mt-0">
            <KYCContent />
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Payment methods</h2>
                <Dialog open={addPaymentMethodOpen} onOpenChange={setAddPaymentMethodOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add payment method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add payment method</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label>Type</Label>
                        <Select value={addPmType} onValueChange={(v) => setAddPmType(v as "MOBILE" | "BANK")}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MOBILE" className="gap-2">
                              <Smartphone className="w-4 h-4 inline mr-2" />
                              Mobile Money
                            </SelectItem>
                            <SelectItem value="BANK" className="gap-2">
                              <Building2 className="w-4 h-4 inline mr-2" />
                              Bank account
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Account / recipient name</Label>
                        <Input
                          value={addPmForm.account_name}
                          onChange={(e) => setAddPmForm({ ...addPmForm, account_name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="mt-1.5"
                        />
                      </div>
                      {addPmType === "MOBILE" && (
                        <>
                          <div>
                            <Label>Phone number</Label>
                            <PhoneInput
                              value={addPmForm.phone_number}
                              onChange={(v) => setAddPmForm({ ...addPmForm, phone_number: v })}
                              defaultCountry="UG"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label>Network</Label>
                            <Select value={addPmForm.network} onValueChange={(v) => setAddPmForm({ ...addPmForm, network: v })}>
                              <SelectTrigger className="mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                                <SelectItem value="Airtel">Airtel Money</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                      {addPmType === "BANK" && (
                        <>
                          <div>
                            <Label>Bank name</Label>
                            <Input
                              value={addPmForm.bank_name}
                              onChange={(e) => setAddPmForm({ ...addPmForm, bank_name: e.target.value })}
                              placeholder="e.g. Stanbic Bank"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label>Account number</Label>
                            <Input
                              value={addPmForm.account_number}
                              onChange={(e) => setAddPmForm({ ...addPmForm, account_number: e.target.value })}
                              placeholder="Account number"
                              className="mt-1.5"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <Label>Address (optional)</Label>
                        <Input
                          value={addPmForm.address}
                          onChange={(e) => setAddPmForm({ ...addPmForm, address: e.target.value })}
                          placeholder="e.g. physical address or reference"
                          className="mt-1.5"
                        />
                      </div>
                      <Button onClick={handleAddPaymentMethod} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {isLoadingPaymentMethods ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-border bg-muted/30">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No payment methods yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add a mobile money or bank account to use when sending or receiving.</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => setAddPaymentMethodOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Add payment method
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.payment_method_id || pm.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {pm.type === "MOBILE" || pm.type === "MOBILE_MONEY" ? (
                            <Smartphone className="w-5 h-5 text-primary" />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{pm.account_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pm.type === "MOBILE" || pm.type === "MOBILE_MONEY"
                              ? (() => {
                                  const p = (pm.phone_number || "").replace(/\s/g, "");
                                  const digits = p.replace(/\D/g, "");
                                  const plus = p.startsWith("+") ? "+" : "";
                                  return plus + digits.replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
                                })()
                              : `${pm.bank_name || ""} · ${pm.account_number || ""}`}
                          </p>
                          {pm.bank_address && (
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={pm.bank_address}>
                              {pm.bank_address}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeletePaymentMethod(pm.payment_method_id || pm.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
};

// Network Content Component
const NetworkContent = () => {
  const { isConnected, address, network } = useXRPLWallet();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">XRPL Network Settings</h2>
        <p className="text-sm text-muted-foreground">
          Frontend is locked to Mainnet.
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
            Current network: <span className="font-medium text-foreground">{network || "Mainnet"}</span>
          </p>
        </div>
      </div>
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

// KYC Content Component - Backend-driven

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

const statusLabels = {
  verified: "Verified",
  pending: "Under Review",
  unverified: "Not Started",
};

const KYCContent = () => {
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      setIsLoadingKyc(true);
      const response = await kycApi.getKycStatus();
      if (response.data) {
        setKycStatus(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch KYC status:", error);
    } finally {
      setIsLoadingKyc(false);
    }
  };

  const buildSteps = () => {
    if (!kycStatus) {
      return [
        { id: "email", title: "Email Verification", description: "Verify your email address", status: "unverified" as VerificationStatus, icon: CheckCircle },
        { id: "phone", title: "Phone Verification", description: "Verify your phone number", status: "unverified" as VerificationStatus, icon: CheckCircle },
        { id: "id", title: "ID Document", description: "Upload a valid government-issued ID", status: "unverified" as VerificationStatus, icon: FileText, canUpload: true },
        { id: "selfie", title: "Selfie Verification", description: "Take a selfie for identity verification", status: "unverified" as VerificationStatus, icon: Camera, canUpload: true },
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

  if (isLoadingKyc) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-sm font-medium">
                      {statusLabels.verified}
                    </span>
                  )}
                  {step.status === "pending" && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-sm font-medium">
                      {statusLabels.pending}
                    </span>
                  )}
                  {step.status === "unverified" && "canUpload" in step && step.canUpload && (
                    <Button variant="outline" size="sm" onClick={() => toast.info("Document upload coming soon.")}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  )}
                  {step.status === "unverified" && !("canUpload" in step && step.canUpload) && (
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