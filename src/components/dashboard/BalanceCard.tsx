import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowDownCircle,
  Send,
  ArrowLeftRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getCurrencyById } from "@/data/currencies";
import {
  getCashAssetsForNetwork,
  type SupportedAsset,
} from "@/data/supportedAssets";
import { xrplService } from "@/services/xrplService";
import { baseService } from "@/services/baseService";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import { useSelectedChain } from "@/contexts/SelectedChainContext";
import { toast } from "sonner";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onSend: () => void;
  onSwap: () => void;
  onBalanceUpdate?: () => void;
  refreshTrigger?: number;
}

function currencyLookupId(asset: SupportedAsset) {
  if (asset.chain === "base") {
    return asset.code === "USDC" ? "usdc-base" : "usdt-base";
  }
  return asset.code.toLowerCase();
}

type BalanceRow = { asset: SupportedAsset; balance: string; loading: boolean };

export const BalanceOverview = ({
  onDeposit,
  onSend,
  onSwap,
  onBalanceUpdate,
  refreshTrigger,
}: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, address, network } = useXRPLWallet();
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();
  const { selectedChain, walletConnected, walletAddress } = useSelectedChain();

  const chainLabel = selectedChain === "base" ? "Base" : "XRP";
  const assets = getCashAssetsForNetwork(selectedChain);

  const fetchBalances = useCallback(async () => {
    setIsLoading(true);
    const next: BalanceRow[] = assets.map((asset) => ({
      asset,
      balance: "0",
      loading: true,
    }));
    setRows(next);

    try {
      if (selectedChain === "xrpl") {
        if (!isConnected || !address) {
          setRows(assets.map((a) => ({ asset: a, balance: "0", loading: false })));
          return;
        }
        const xrplBalances = await xrplService.getAccountBalances(
          address,
          network || "Mainnet"
        );
        setRows(
          assets.map((asset) => {
            if (asset.code === "RLUSD") {
              const t = xrplBalances.find(
                (b) =>
                  xrplService.formatCurrency(b.currency) === "RLUSD" ||
                  b.currency === "RLUSD"
              );
              return { asset, balance: t?.value ?? "0", loading: false };
            }
            return { asset, balance: "0", loading: false };
          })
        );
        return;
      }

      if (!evmConnected || !evmAddress) {
        setRows(assets.map((a) => ({ asset: a, balance: "0", loading: false })));
        return;
      }

      const settled = await Promise.all(
        assets.map(async (asset) => {
          if (!asset.contractAddress) {
            return { asset, balance: "0", loading: false };
          }
          const bal = await baseService.getErc20Balance(
            evmAddress,
            asset.contractAddress,
            asset.decimals
          );
          return { asset, balance: bal, loading: false };
        })
      );
      setRows(settled);
    } catch (error: unknown) {
      console.error("Balance fetch error:", error);
      const msg = error instanceof Error ? error.message : "Failed to fetch balances";
      toast.error(msg);
      setRows(assets.map((a) => ({ asset: a, balance: "0", loading: false })));
    } finally {
      setIsLoading(false);
    }
  }, [selectedChain, assets, isConnected, address, network, evmConnected, evmAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      fetchBalances();
    }
  }, [refreshTrigger, fetchBalances]);

  useEffect(() => {
    if (!onBalanceUpdate) return;
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [onBalanceUpdate, fetchBalances]);

  const formatAmount = (val: string) => {
    if (hidden) return "••••••";
    const num = parseFloat(val);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const addrShort =
    walletConnected && walletAddress
      ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)} · ${chainLabel}`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">
            Cash-Out & Cash-In
          </p>
          <p className="text-xs text-primary-foreground/50 mb-4">{chainLabel} network</p>

          {!walletConnected ? (
            <p className="text-sm text-primary-foreground/80">
              Connect wallet to view balances
            </p>
          ) : (
            <div className="space-y-3">
              {(rows.length ? rows : assets.map((a) => ({ asset: a, balance: "0", loading: isLoading }))).map(
                ({ asset, balance, loading }) => {
                  const logo =
                    getCurrencyById(currencyLookupId(asset))?.logo ?? asset.logo;
                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {logo ? (
                          <img
                            src={logo}
                            alt={asset.code}
                            className="w-7 h-7 object-contain rounded-full shrink-0"
                          />
                        ) : null}
                        <span className="font-semibold text-lg">{asset.code}</span>
                      </div>
                      <div className="flex items-baseline gap-2 shrink-0">
                        {loading || isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <span className="text-2xl md:text-3xl font-bold tabular-nums">
                            {formatAmount(balance)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
          {addrShort && (
            <p className="text-xs text-primary-foreground/60 mt-3">{addrShort}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchBalances}
            disabled={isLoading || !walletConnected}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
            title="Refresh balances"
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
