import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowDownCircle, Send, ArrowLeftRight, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrencyById } from "@/data/currencies";
import { SUPPORTED_ASSETS, getSupportedAssetById } from "@/data/supportedAssets";
import { xrplService } from "@/services/xrplService";
import { baseService } from "@/services/baseService";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import { toast } from "sonner";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onSend: () => void;
  onSwap: () => void;
  onBalanceUpdate?: () => void;
  refreshTrigger?: number;
}

function currencyLookupId(asset: ReturnType<typeof getSupportedAssetById>) {
  if (!asset) return "rlusd";
  if (asset.chain === "base") {
    return asset.code === "USDC" ? "usdc-base" : "usdt-base";
  }
  return asset.code.toLowerCase();
}

export const BalanceOverview = ({ onDeposit, onSend, onSwap, onBalanceUpdate, refreshTrigger }: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, address, network } = useXRPLWallet();
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();
  const [overviewAssetId, setOverviewAssetId] = useState(SUPPORTED_ASSETS[0]?.id ?? "rlusd-xrpl");
  const selected = getSupportedAssetById(overviewAssetId) ?? SUPPORTED_ASSETS[0];
  const currency = selected.code;
  const currencyInfo =
    getCurrencyById(currencyLookupId(selected)) || getCurrencyById(selected.code.toLowerCase());

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      if (selected.chain === "xrpl") {
        if (!isConnected || !address) {
          setBalance("0");
          return;
        }
        const xrplBalances = await xrplService.getAccountBalances(address, network || "Mainnet");
        if (selected.code === "XRP") {
          const x = xrplBalances.find((b) => b.currency === "XRP");
          setBalance(x?.value ?? "0");
          return;
        }
        if (selected.code === "RLUSD") {
          const t = xrplBalances.find(
            (b) =>
              xrplService.formatCurrency(b.currency) === "RLUSD" || b.currency === "RLUSD"
          );
          setBalance(t?.value ?? "0");
          return;
        }
        setBalance("0");
        return;
      }

      if (selected.chain === "base" && selected.contractAddress) {
        if (!evmConnected || !evmAddress) {
          setBalance("0");
          return;
        }
        const bal = await baseService.getErc20Balance(
          evmAddress,
          selected.contractAddress,
          selected.decimals
        );
        setBalance(bal);
        return;
      }

      setBalance("0");
    } catch (error: unknown) {
      console.error("Balance fetch error:", error);
      const msg = error instanceof Error ? error.message : "Failed to fetch balance";
      toast.error(msg);
      setBalance("0");
    } finally {
      setIsLoading(false);
    }
  }, [selected, isConnected, address, network, evmConnected, evmAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      fetchBalance();
    }
  }, [refreshTrigger, fetchBalance]);

  useEffect(() => {
    if (!onBalanceUpdate) return;
    const interval = setInterval(() => {
      fetchBalance();
    }, 30000);
    return () => clearInterval(interval);
  }, [onBalanceUpdate, fetchBalance]);

  const formatAmountNoDecimals = (val: string | number) => {
    if (hidden) return "••••••";
    const numVal = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(numVal)) return "0";
    return numVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const walletOk =
    selected.chain === "xrpl" ? isConnected : selected.chain === "base" ? evmConnected : false;
  const addrShort =
    selected.chain === "xrpl" && address
      ? `${address.slice(0, 8)}...${address.slice(-6)} · XRPL`
      : selected.chain === "base" && evmAddress
        ? `${evmAddress.slice(0, 8)}...${evmAddress.slice(-6)} · Base`
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-primary-foreground/70 text-sm font-medium mb-2">Cash-Out & Cash-In</p>
          <Select value={overviewAssetId} onValueChange={setOverviewAssetId}>
            <SelectTrigger className="w-full max-w-[220px] h-9 bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground text-sm mb-3">
              <SelectValue placeholder="Asset" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_ASSETS.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} · {a.chain === "base" ? "Base" : "XRPL"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!walletOk ? (
            <div className="space-y-2">
              <p className="text-primary-foreground/90 text-sm">Wallet not connected</p>
              <p className="text-xs text-primary-foreground/60">
                Connect your {selected.chain === "base" ? "Base (EVM)" : "XRPL"} wallet to view {currency} balance
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {currencyInfo ? (
                <img
                  src={currencyInfo.logo}
                  alt={currency}
                  className="w-8 h-6 object-contain rounded"
                />
              ) : null}
              <div className="flex items-baseline gap-2">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <span className="text-3xl md:text-4xl font-bold">
                    {formatAmountNoDecimals(balance)}
                  </span>
                )}
                <span className="text-primary-foreground/70 text-lg">{currency}</span>
              </div>
            </div>
          )}
          {addrShort && (
            <p className="text-xs text-primary-foreground/60 mt-2">{addrShort}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchBalance}
            disabled={isLoading || !walletOk}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setHidden(!hidden)}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
          >
            {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={onDeposit}
          className="flex-1 min-w-[100px] bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" />
          Cash-In
        </Button>
        <Button
          onClick={onSwap}
          className="flex-1 min-w-[100px] bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Swap
        </Button>
        <Button
          onClick={onSend}
          className="flex-1 min-w-[100px] bg-accent hover:bg-accent/90 text-accent-foreground border-0 h-11 font-semibold"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>
    </motion.div>
  );
};
