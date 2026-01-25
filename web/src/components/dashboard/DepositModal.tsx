import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, CreditCard, Bitcoin, Copy, Check, QrCode, Loader2, ChevronDown, Info, ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { walletApi, paymentMethodApi, PaymentMethod as ApiPaymentMethod } from "@/services/api";
import { cryptoCurrencies, fiatCurrencies, Currency } from "@/data/currencies";
import { useAuth } from "@/contexts/AuthContext";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type DepositMethod = "mobile" | "crypto" | "";

const depositMethods = [
  { value: "mobile", label: "Mobile Money", description: "MTN, Airtel & more", icon: Smartphone },
  { value: "crypto", label: "Cryptocurrency", description: "USDC, USDT, RLUSD", icon: Bitcoin },
];

const mobileNetworks = [
  { id: "mtn", name: "MTN Mobile Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/1200px-New-mtn-logo.svg.png" },
  { id: "airtel", name: "Airtel Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Airtel_Africa_logo.svg/1200px-Airtel_Africa_logo.svg.png" },
];

interface SavedPhoneNumber {
  id: string;
  name: string;
  phone: string;
  network?: string;
}

export const DepositModal = ({ isOpen, onClose, onSuccess }: DepositModalProps) => {
  const [method, setMethod] = useState<DepositMethod>("");
  const [network, setNetwork] = useState("");
  const [phoneOption, setPhoneOption] = useState<"saved" | "onetime">("saved");
  const [phone, setPhone] = useState("");
  const [selectedSavedPhone, setSelectedSavedPhone] = useState<SavedPhoneNumber | null>(null);
  const [savedPhoneOpen, setSavedPhoneOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(fiatCurrencies[0]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [depositAddresses, setDepositAddresses] = useState<Record<string, string>>({});
  const [supportedAssets, setSupportedAssets] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);

  // Fetch data when method is selected
  useEffect(() => {
    if (isOpen && method) {
      if (method === "crypto") {
        fetchDepositAddresses();
        fetchSupportedAssets();
      } else if (method === "mobile") {
        fetchPaymentMethods();
      }
    }
  }, [isOpen, method]);


  const fetchDepositAddresses = async () => {
    try {
      const response = await walletApi.getDepositAddresses();
      console.log("Deposit Addresses API Response:", response); // Debug log
      
      // Map the response to wallet addresses by asset_code and chain_code
      const addresses: Record<string, string> = {};
      let addressesArray: any[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          addressesArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          addressesArray = response.data.data;
        }
      }
      
      addressesArray.forEach((addr: any) => {
        if (addr.asset_code && addr.address) {
          // Create a unique key: asset_code-chain_code or just asset_code
          const key = addr.chain_code 
            ? `${addr.asset_code.toUpperCase()}-${addr.chain_code.toUpperCase()}`
            : addr.asset_code.toUpperCase();
          addresses[key] = addr.address;
          // Also store by asset_code alone for fallback
          addresses[addr.asset_code.toUpperCase()] = addr.address;
        }
      });
      
      console.log("Mapped deposit addresses:", addresses); // Debug log
      setDepositAddresses(addresses);
    } catch (error: any) {
      console.error("Failed to fetch deposit addresses:", error);
      setDepositAddresses({});
    }
  };

  const fetchSupportedAssets = async () => {
    try {
      const response = await walletApi.getSupportedAssets();
      console.log("Supported Assets API Response:", response); // Debug log
      
      // Handle different response structures
      let assets: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          assets = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          assets = response.data.data;
        }
      }
      
      console.log("Parsed supported assets:", assets); // Debug log
      setSupportedAssets(assets);
      
      // Set first asset as default if available
      if (assets.length > 0 && !selectedToken) {
        setSelectedToken(assets[0]);
      }
    } catch (error: any) {
      console.error("Failed to fetch supported assets:", error);
      setSupportedAssets([]);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await paymentMethodApi.getUserPaymentMethods("MOBILE");
      if (response.data) {
        setPaymentMethods(response.data);
        // Map to savedPhoneNumbers format
        const mapped = response.data.map((pm, idx) => ({
          id: pm.id,
          name: pm.account_name,
          phone: pm.phone_number || pm.account_number || "",
          network: pm.type === "MOBILE" ? "mtn" : undefined,
        }));
        // Update savedPhoneNumbers state if needed
      }
    } catch (error: any) {
      console.error("Failed to fetch payment methods:", error);
    }
  };

  const fee = amount && !isNaN(parseFloat(amount)) && method === "mobile"
    ? parseFloat(amount) * 0.005 // 0.5% for mobile
    : 0;
  const totalAmount = amount && !isNaN(parseFloat(amount))
    ? parseFloat(amount) + fee
    : 0;

  const copyAddress = async () => {
    if (!selectedToken) {
      toast.error("Please select a token first");
      return;
    }
    
    // Try to find address by asset_code and chain_code combination
    const assetCode = (selectedToken.asset_code || selectedToken.symbol || "").toUpperCase();
    const chainCode = (selectedToken.chain_code || "").toUpperCase();
    const addressKey = chainCode ? `${assetCode}-${chainCode}` : assetCode;
    
    const address = depositAddresses[addressKey] || depositAddresses[assetCode] || "";
    
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied! Wallet address copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Address not available for this asset. Please try again.");
    }
  };

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (method === "mobile" && !phone) {
      toast.error("Please enter or select a phone number");
      return;
    }

    setIsLoading(true);

    try {
      if (method === "mobile") {
        const phoneNumber = phoneOption === "saved" && selectedSavedPhone
          ? selectedSavedPhone.phone.replace(/\s/g, "")
          : phone.replace(/\s/g, "");

        const response = await walletApi.depositRequest({
          amount: parseFloat(amount),
          currency: userCurrency,
          account_number: phoneNumber,
        });

        if (response.status === 200) {
          toast.success(response.message || "Deposit initiated! Please complete the payment on your phone.");
          resetAndClose();
          if (onSuccess) onSuccess();
        }
      } else if (method === "crypto") {
        // For crypto, we just show the address - actual deposit happens on blockchain
        toast.info("Send funds to the displayed address. Transaction will be confirmed on blockchain.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate deposit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setMethod("");
    setNetwork("");
    setPhone("");
    setSelectedSavedPhone(null);
    setPhoneOption("saved");
    setAmount("");
    setSelectedToken(null);
    onClose();
  };

  useEffect(() => {
    if (selectedSavedPhone) {
      setPhone(selectedSavedPhone.phone);
      if (selectedSavedPhone.network) {
        setNetwork(selectedSavedPhone.network);
      }
    } else if (phoneOption === "onetime") {
      setPhone("");
    }
  }, [selectedSavedPhone, phoneOption]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
          className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative bg-card h-full w-full max-w-md shadow-2xl border-l border-border flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {method && (
                <button
                  onClick={() => setMethod("")}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">Deposit Funds</h2>
                <p className="text-sm text-muted-foreground">Add money to your wallet</p>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Deposit Method Selection */}
            {!method && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Deposit Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  {depositMethods.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMethod(m.value as DepositMethod)}
                        className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{m.label}</p>
                            <p className="text-xs text-muted-foreground">{m.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile Money Form */}
            {method === "mobile" && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">Payment Network</Label>
                  <Select value={network} onValueChange={setNetwork}>
                    <SelectTrigger className="mt-1.5 h-12 bg-background">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {mobileNetworks.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          <div className="flex items-center gap-3">
                            <img src={n.logo} alt={n.name} className="w-5 h-5 object-contain" />
                            <span>{n.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Phone Number</Label>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => setPhoneOption("saved")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        phoneOption === "saved"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Saved Number
                    </button>
                    <button
                      onClick={() => setPhoneOption("onetime")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        phoneOption === "onetime"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      One-time Number
                    </button>
                  </div>
                  
                  {phoneOption === "saved" ? (
                    <Popover open={savedPhoneOpen} onOpenChange={setSavedPhoneOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={savedPhoneOpen}
                          className="w-full mt-2 h-12 justify-between"
                        >
                          {selectedSavedPhone ? (
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{selectedSavedPhone.name}</span>
                              <span className="text-xs text-muted-foreground">{selectedSavedPhone.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Select saved number...</span>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search saved numbers..." />
                          <CommandList>
                            <CommandEmpty>No saved numbers found.</CommandEmpty>
                            <CommandGroup>
                              {paymentMethods.map((pm) => {
                                const phoneNumber = pm.phone_number || pm.account_number || "";
                                return (
                                  <CommandItem
                                    key={pm.id}
                                    value={`${pm.account_name} ${phoneNumber}`}
                                    onSelect={() => {
                                      setSelectedSavedPhone({
                                        id: pm.id,
                                        name: pm.account_name,
                                        phone: phoneNumber,
                                        network: pm.type === "MOBILE" ? "mtn" : undefined,
                                      });
                                      setSavedPhoneOpen(false);
                                    }}
                                    className="flex flex-col items-start py-3"
                                  >
                                    <span className="font-medium">{pm.account_name}</span>
                                    <span className="text-xs text-muted-foreground">{phoneNumber}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="mt-2">
                      <PhoneInput
                        value={phone}
                        onChange={(value) => setPhone(value || "")}
                        className="h-12"
                      />
                    </div>
                  )}
                </div>

                <AmountWithCurrency
                  amount={amount}
                  onAmountChange={setAmount}
                  currency={fiatCurrencies.find(c => c.id === userCurrencyId) || fiatCurrencies[0]}
                  onCurrencyChange={() => {}} // Mobile deposit uses user's currency, not changeable
                  currencies={fiatCurrencies.filter(c => c.id === userCurrencyId)}
                  placeholder="0.00"
                  showIcon={false}
                  currencySelectWidth="w-32"
                />
                {amount && method === "mobile" && (
                  <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Transaction Fee</span>
                      <span className="font-medium">
                        {fee.toFixed(2)} {userCurrency} (0.5%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-semibold">
                        {(parseFloat(amount) + fee).toFixed(2)} {userCurrency}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 pt-2 border-t border-primary/20">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Processing time: 1-2 minutes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Crypto Form */}
            {method === "crypto" && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">Select Token to Deposit</Label>
                  {supportedAssets.length === 0 ? (
                    <div className="mt-1.5 h-14 bg-muted rounded-md flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading assets...</span>
                    </div>
                  ) : (
                    <Select 
                      value={selectedToken ? String(selectedToken.id) : ""} 
                      onValueChange={(v) => {
                        const asset = supportedAssets.find(a => String(a.id) === v);
                        if (asset) {
                          setSelectedToken(asset);
                          // Fetch address for this specific asset
                          fetchDepositAddresses();
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1.5 h-14 bg-background">
                        <SelectValue>
                          {selectedToken ? (
                            <div className="flex items-center gap-3">
                              <img 
                                src={selectedToken.icon || selectedToken.logo || ""} 
                                alt={selectedToken.asset_code || selectedToken.symbol} 
                                className="w-7 h-7 object-contain rounded-full" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/28";
                                }}
                              />
                              <div className="text-left">
                                <p className="font-semibold">{selectedToken.asset_code || selectedToken.symbol}</p>
                                <p className="text-xs text-muted-foreground">{selectedToken.chain_name || selectedToken.network || ""}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Select token...</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {supportedAssets.map((asset) => (
                          <SelectItem key={asset.id} value={String(asset.id)}>
                            <div className="flex items-center gap-3">
                              <img 
                                src={asset.icon || asset.logo || ""} 
                                alt={asset.asset_code || asset.symbol} 
                                className="w-6 h-6 object-contain rounded-full" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/24";
                                }}
                              />
                              <div>
                                <p className="font-medium">{asset.asset_code || asset.symbol}</p>
                                <p className="text-xs text-muted-foreground">{asset.chain_name || asset.network || asset.chain_code || ""}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Wallet Address</Label>
                  <div className="mt-2 p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm text-foreground break-all">
                        {selectedToken ? (() => {
                          const assetCode = selectedToken.asset_code?.toUpperCase() || selectedToken.symbol?.toUpperCase();
                          const chainCode = selectedToken.chain_code?.toUpperCase();
                          const addressKey = chainCode ? `${assetCode}-${chainCode}` : assetCode;
                          return depositAddresses[addressKey] || depositAddresses[assetCode] || "Loading address...";
                        })() : "Select a token first"}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="p-2 rounded-lg hover:bg-background transition-colors shrink-0"
                        disabled={!selectedToken || (() => {
                          const assetCode = selectedToken.asset_code?.toUpperCase() || selectedToken.symbol?.toUpperCase() || "";
                          const chainCode = selectedToken.chain_code?.toUpperCase() || "";
                          const addressKey = chainCode ? `${assetCode}-${chainCode}` : assetCode;
                          return !depositAddresses[addressKey] && !depositAddresses[assetCode];
                        })()}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-accent" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center py-4">
                  <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center border border-border">
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Send only <span className="font-semibold text-foreground">{selectedToken?.asset_code || selectedToken?.symbol}</span> ({selectedToken?.chain_name || selectedToken?.network || selectedToken?.chain_code}) to this address
                </p>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• No deposit fees for crypto deposits</p>
                      <p>• Minimum deposit: {selectedToken?.min_deposit || 10} {selectedToken?.asset_code || selectedToken?.symbol}</p>
                      <p>• Processing time: 1-3 blockchain confirmations (usually 5-15 minutes)</p>
                      <p>• Only send {selectedToken?.asset_code || selectedToken?.symbol} on {selectedToken?.chain_name || selectedToken?.network || selectedToken?.chain_code} network</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-4">
            {method === "mobile" && (
              <Button 
                onClick={handleConfirm} 
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={!network || !phone || !amount || isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Deposit"}
              </Button>
            )}
            {method === "crypto" && (
              <Button 
                onClick={handleConfirm} 
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "I've Sent the Funds"}
              </Button>
            )}

            {/* Fee Summary Footer */}
            {method && method === "mobile" && amount && !isNaN(parseFloat(amount)) && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="font-medium text-foreground">
                    {fee.toFixed(2)} {userCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold text-foreground">
                    {(parseFloat(amount) + fee).toFixed(2)} {userCurrency}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
