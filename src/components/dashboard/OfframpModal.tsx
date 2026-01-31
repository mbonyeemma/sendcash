import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Wallet, Copy, Check, Plus, Trash2, AlertCircle, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { walletApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cryptoCurrencies, fiatCurrencies, Currency, exchangeRates } from "@/data/currencies";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";

interface OfframpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ConnectedWallet {
  id: string;
  address: string;
  chain: string;
  asset: string;
  autoOfframp: boolean;
}

export const OfframpModal = ({ isOpen, onClose, onSuccess }: OfframpModalProps) => {
  const { user } = useAuth();
  const { isConnected, address, network, connectWallet, isConnecting } = useXRPLWallet();
  const userCurrency = user?.currency || "UGX";
  const [step, setStep] = useState<"connect" | "create">("connect");
  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Connect wallet form
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Currency>(cryptoCurrencies[0]);

  // Create offramp form - Only RLUSD
  const rlusdCurrency = cryptoCurrencies.find(c => c.symbol === "RLUSD") || cryptoCurrencies[0];
  const [toCurrency, setToCurrency] = useState<Currency>(fiatCurrencies.find(c => c.id === userCurrency.toLowerCase()) || fiatCurrencies[0]);
  const [amount, setAmount] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const chains = [
    { value: "BSC", label: "Binance Smart Chain (BSC)" },
    { value: "TRON", label: "Tron" },
    { value: "EVM", label: "Ethereum / EVM" },
    { value: "STELLAR", label: "Stellar" },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchWallets();
    }
  }, [isOpen]);

  const fetchWallets = async () => {
    try {
      setIsLoadingWallets(true);
      const response = await walletApi.getDepositAddresses();
      if (response.data) {
        // Transform deposit addresses into connected wallets format
        const walletList: ConnectedWallet[] = [];
        if (response.data.stellar) {
          walletList.push({
            id: "stellar-1",
            address: response.data.stellar,
            chain: "STELLAR",
            asset: "USDC",
            autoOfframp: false,
          });
        }
        if (response.data.tron) {
          walletList.push({
            id: "tron-1",
            address: response.data.tron,
            chain: "TRON",
            asset: "USDT",
            autoOfframp: false,
          });
        }
        if (response.data.binance) {
          walletList.push({
            id: "bsc-1",
            address: response.data.binance,
            chain: "BSC",
            asset: "USDC",
            autoOfframp: false,
          });
        }
        setWallets(walletList);
      }
    } catch (error: any) {
      console.error("Failed to fetch wallets:", error);
      toast.error("Failed to load connected wallets");
    } finally {
      setIsLoadingWallets(false);
    }
  };

  const handleConnectWallet = async () => {
    const newErrors: Record<string, string> = {};
    if (!walletAddress.trim()) {
      newErrors.walletAddress = "Please enter wallet address";
    }
    if (!selectedChain) {
      newErrors.chain = "Please select a blockchain";
    }
    if (!selectedAsset) {
      newErrors.asset = "Please select an asset";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to connect external wallet address
      // For now, we'll add it to the local state
      const newWallet: ConnectedWallet = {
        id: `custom-${Date.now()}`,
        address: walletAddress.trim(),
        chain: selectedChain,
        asset: selectedAsset.symbol,
        autoOfframp: false,
      };
      setWallets([...wallets, newWallet]);
      toast.success("Wallet connected successfully");
      setWalletAddress("");
      setSelectedChain("");
      setSelectedAsset(cryptoCurrencies[0]);
      setErrors({});
    } catch (error: any) {
      toast.error(error.message || "Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOfframp = async () => {
    const newErrors: Record<string, string> = {};
    if (!selectedWallet) {
      newErrors.wallet = "Please select a wallet";
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    if (!pin) {
      newErrors.pin = "Please enter your transaction PIN";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const wallet = wallets.find(w => w.id === selectedWallet);
      if (!wallet) {
        toast.error("Selected wallet not found");
        return;
      }

      // TODO: Call API to create offramp transaction
      // This should trigger an offramp when funds arrive at the wallet address
      const offrampData = {
        wallet_address: wallet.address,
        chain: wallet.chain,
        asset: "RLUSD", // Only RLUSD for offramp
        amount: parseFloat(amount),
        to_currency: toCurrency.symbol,
        pin: pin,
      };

      // Simulated API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Offramp created successfully! Funds will be automatically converted when received.");
      resetAndClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create offramp");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallet = (walletId: string) => {
    setWallets(wallets.filter(w => w.id !== walletId));
    toast.success("Wallet removed");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const getRate = () => {
    return exchangeRates[rlusdCurrency.id]?.[toCurrency.id] || 1;
  };

  const resetAndClose = () => {
    setStep("connect");
    setWalletAddress("");
    setSelectedChain("");
    setSelectedAsset(cryptoCurrencies.find(c => c.symbol === "RLUSD") || cryptoCurrencies[0]);
    setAmount("");
    setSelectedWallet("");
    setPin("");
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={resetAndClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md h-[90vh] max-h-[700px] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {step === "create" && (
                <button
                  onClick={() => setStep("connect")}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  <X className="w-5 h-5 rotate-45" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {step === "connect" ? "Connect Wallet" : "Create Offramp"}
                </h2>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {step === "connect" ? (
              <>
                {/* Connected Wallets */}
                {isLoadingWallets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : wallets.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Connected Wallets</Label>
                    {wallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="p-4 rounded-xl border border-border bg-muted/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Wallet className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">{wallet.chain}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{wallet.asset}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                                {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(wallet.address, wallet.id)}
                                className="p-1 hover:bg-background rounded transition-colors"
                              >
                                {copiedAddress === wallet.id ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </div>
                          {wallet.id.startsWith("custom-") && (
                            <button
                              onClick={() => handleDeleteWallet(wallet.id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No wallets connected</p>
                  </div>
                )}

                {/* Connect New Wallet */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <Label className="text-sm font-medium">Connect External Wallet</Label>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Blockchain</Label>
                    <Select value={selectedChain} onValueChange={setSelectedChain}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        {chains.map((chain) => (
                          <SelectItem key={chain.value} value={chain.value}>
                            {chain.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.chain && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.chain}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Asset</Label>
                    <Select
                      value={selectedAsset.id}
                      onValueChange={(v) => {
                        const asset = cryptoCurrencies.find(c => c.id === v);
                        if (asset) setSelectedAsset(asset);
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <img src={selectedAsset.logo} alt={selectedAsset.symbol} className="w-5 h-5" />
                            <span>{selectedAsset.symbol}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {cryptoCurrencies.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            <div className="flex items-center gap-2">
                              <img src={asset.logo} alt={asset.symbol} className="w-5 h-5" />
                              <span>{asset.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.asset && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.asset}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Wallet Address</Label>
                    <Input
                      value={walletAddress}
                      onChange={(e) => {
                        setWalletAddress(e.target.value);
                        if (errors.walletAddress) setErrors({ ...errors, walletAddress: "" });
                      }}
                      placeholder="0x..."
                      className="h-12 font-mono text-sm"
                    />
                    {errors.walletAddress && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.walletAddress}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleConnectWallet}
                    disabled={isLoading}
                    className="w-full h-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Connect Wallet
                      </>
                    )}
                  </Button>
                </div>

                {/* Create Offramp Button */}
                {wallets.length > 0 && (
                  <Button
                    onClick={() => setStep("create")}
                    variant="outline"
                    className="w-full h-12"
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Create Offramp
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Create Offramp Form */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Wallet</Label>
                    <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select a connected wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4" />
                              <span>{wallet.chain} - {wallet.asset}</span>
                              <span className="text-xs text-muted-foreground">
                                ({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.wallet && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.wallet}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">From Asset</Label>
                    <div className="h-12 bg-muted rounded-md border border-border flex items-center gap-2 px-3">
                      {rlusdCurrency.logo && (
                        <img src={rlusdCurrency.logo} alt={rlusdCurrency.symbol} className="w-5 h-5" />
                      )}
                      <span className="font-medium">{rlusdCurrency.symbol}</span>
                      <span className="text-xs text-muted-foreground ml-auto">RLUSD Only</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">To Currency</Label>
                    <Select
                      value={toCurrency.id}
                      onValueChange={(v) => {
                        const currency = fiatCurrencies.find(c => c.id === v);
                        if (currency) setToCurrency(currency);
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <img src={toCurrency.logo} alt={toCurrency.symbol} className="w-5 h-5" />
                            <span>{toCurrency.symbol}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {fiatCurrencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <img src={c.logo} alt={c.symbol} className="w-5 h-5" />
                              <span>{c.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <AmountWithCurrency
                    amount={amount}
                    onAmountChange={(value) => {
                      setAmount(value);
                      if (errors.amount) setErrors({ ...errors, amount: "" });
                    }}
                    currency={rlusdCurrency}
                    onCurrencyChange={() => {}} // Offramp is RLUSD only, not changeable
                    currencies={[rlusdCurrency]}
                    error={errors.amount}
                    placeholder="0.00"
                    disabled={true}
                  />
                  {amount && !isNaN(parseFloat(amount)) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You will receive: {(parseFloat(amount) * getRate()).toLocaleString()} {toCurrency.symbol}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Offramp is only available for RLUSD
                  </p>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Transaction PIN</Label>
                    <Input
                      type="password"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        if (errors.pin) setErrors({ ...errors, pin: "" });
                      }}
                      placeholder="Enter your PIN"
                      className="h-12"
                      maxLength={6}
                    />
                    {errors.pin && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.pin}
                      </p>
                    )}
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>How it works:</strong> When you send crypto to your connected wallet address, 
                      it will automatically be converted to {toCurrency.symbol} and paid out to your account.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {step === "create" && (
            <div className="p-6 border-t border-border">
              <Button
                onClick={handleCreateOfframp}
                disabled={isLoading}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Create Offramp
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
