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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onSend: () => void;
  onSwap: () => void;
  onBalanceUpdate?: () => void;
  refreshTrigger?: number;
}

type BalanceRow = { asset: SupportedAsset; balance: string; loading: boolean };

function currencyLookupId(asset: SupportedAsset) {
  if (asset.chain === "base") {
    return asset.code === "USDC" ? "usdc-base" : "usdt-base";
  }
  return asset.code.toLowerCase();
}

function AssetCard({
  asset,
  balance,
  loading,
  hidden,
  address,
  networkLabel,
  networkColor,
}: {
  asset: SupportedAsset;
  balance: string;
  loading: boolean;
  hidden: boolean;
  address?: string;
  networkLabel: string;
  networkColor: "blue" | "green";
}) {
  const logo = getCurrencyById(currencyLookupId(asset))?.logo ?? asset.logo;
  const formatted = hidden
    ? "••••"
    : parseFloat(balance).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {logo && (
            <img
              src={logo}
              alt={asset.code}
              className="w-7 h-7 object-contain rounded-full shrink-0"
            />
          )}
          <span className="font-semibold text-sm text-foreground">{asset.code}</span>
        </div>
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
            networkColor === "blue"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          )}
        >
          {networkLabel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-1">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-2xl font-bold tabular-nums text-foreground leading-none">
            {formatted}
          </span>
        )}
        {!hidden && (
          <span className="text-xs text-muted-foreground mb-0.5">USD</span>
        )}
      </div>

      {address && (
        <p className="text-[10px] font-mono text-muted-foreground truncate">
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      )}
    </div>
  );
}

export const BalanceOverview = ({
  onDeposit,
  onSend,
  onSwap,
  onBalanceUpdate,
  refreshTrigger,
}: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const [baseRows, setBaseRows] = useState<BalanceRow[]>([]);
  const [xrplRows, setXrplRows] = useState<BalanceRow[]>([]);
  const [isLoadingBase, setIsLoadingBase] = useState(false);
  const [isLoadingXrpl, setIsLoadingXrpl] = useState(false);

  const { isConnected: xrplConnected, address: xrplAddress, network } = useXRPLWallet();
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();

  const baseAssets = getCashAssetsForNetwork("base");
  const xrplAssets = getCashAssetsForNetwork("xrpl");

  const fetchBaseBalances = useCallback(async () => {
    if (!evmConnected || !evmAddress) {
      setBaseRows(baseAssets.map((a) => ({ asset: a, balance: "0", loading: false })));
      return;
    }
    setIsLoadingBase(true);
    try {
      const results = await Promise.all(
        baseAssets.map(async (asset) => {
          if (!asset.contractAddress) return { asset, balance: "0", loading: false };
          const bal = await baseService.getErc20Balance(
            evmAddress,
            asset.contractAddress,
            asset.decimals
          );
          return { asset, balance: bal, loading: false };
        })
      );
      setBaseRows(results);
    } catch {
      toast.error("Failed to fetch Base balances");
      setBaseRows(baseAssets.map((a) => ({ asset: a, balance: "0", loading: false })));
    } finally {
      setIsLoadingBase(false);
    }
  }, [evmConnected, evmAddress]);

  const fetchXrplBalances = useCallback(async () => {
    if (!xrplConnected || !xrplAddress) {
      setXrplRows(xrplAssets.map((a) => ({ asset: a, balance: "0", loading: false })));
      return;
    }
    setIsLoadingXrpl(true);
    try {
      const balances = await xrplService.getAccountBalances(
        xrplAddress,
        network || "Mainnet"
      );
      setXrplRows(
        xrplAssets.map((asset) => {
          if (asset.code === "RLUSD") {
            const t = balances.find(
              (b) =>
                xrplService.formatCurrency(b.currency) === "RLUSD" ||
                b.currency === "RLUSD"
            );
            return { asset, balance: t?.value ?? "0", loading: false };
          }
          return { asset, balance: "0", loading: false };
        })
      );
    } catch {
      setXrplRows(xrplAssets.map((a) => ({ asset: a, balance: "0", loading: false })));
    } finally {
      setIsLoadingXrpl(false);
    }
  }, [xrplConnected, xrplAddress, network]);

  useEffect(() => {
    fetchBaseBalances();
  }, [fetchBaseBalances]);

  useEffect(() => {
    fetchXrplBalances();
  }, [fetchXrplBalances]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      fetchBaseBalances();
      fetchXrplBalances();
    }
  }, [refreshTrigger, fetchBaseBalances, fetchXrplBalances]);

  useEffect(() => {
    if (!onBalanceUpdate) return;
    const interval = setInterval(() => {
      fetchBaseBalances();
      fetchXrplBalances();
    }, 30000);
    return () => clearInterval(interval);
  }, [onBalanceUpdate, fetchBaseBalances, fetchXrplBalances]);

  const isLoading = isLoadingBase || isLoadingXrpl;
  const neitherConnected = !evmConnected && !xrplConnected;

  const totalBalance = (() => {
    const sumRows = (rows: BalanceRow[]) =>
      rows.reduce((acc, r) => acc + (parseFloat(r.balance) || 0), 0);
    return sumRows(baseRows) + sumRows(xrplRows);
  })();

  const totalFormatted = totalBalance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleRefresh = () => {
    fetchBaseBalances();
    fetchXrplBalances();
  };

  const allRows: (BalanceRow & { address?: string; networkLabel: string; networkColor: "blue" | "green" })[] = [
    ...(evmConnected
      ? (baseRows.length > 0 ? baseRows : baseAssets.map((a) => ({ asset: a, balance: "0", loading: isLoadingBase }))).map((r) => ({
          ...r,
          address: evmAddress ?? undefined,
          networkLabel: "Base",
          networkColor: "blue" as const,
        }))
      : []),
    ...(xrplConnected
      ? (xrplRows.length > 0 ? xrplRows : xrplAssets.map((a) => ({ asset: a, balance: "0", loading: isLoadingXrpl }))).map((r) => ({
          ...r,
          address: xrplAddress ?? undefined,
          networkLabel: "XRPL",
          networkColor: "green" as const,
        }))
      : []),
  ];

  return (
    <>
      {/* Gradient banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-xl"
      >
           <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-primary-foreground/70 text-sm font-medium mb-1">
              Total Portfolio
            </p>
            {neitherConnected ? (
              <p className="text-sm text-primary-foreground/80">
                Connect a wallet to view balances
              </p>
            ) : isLoading && totalBalance === 0 ? (
              <Loader2 className="w-6 h-6 animate-spin mt-1" />
            ) : (
              <p className="text-4xl font-bold tabular-nums leading-none">
                {hidden ? "$ ••••••" : `$${totalFormatted}`}
              </p>
            )}
          </div>

          

          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isLoading || neitherConnected}
              className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
              title="Refresh balances"
            >
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={() => setHidden(!hidden)}
              className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <br/>

        {/* Action buttons — top row */}
        <div className="flex gap-2 flex-wrap mb-6">
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

        {/* Total balance */}
     
      </motion.div>

      {/* Individual asset balance cards */}
      {!neitherConnected && allRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm font-medium text-muted-foreground mb-3">Your Balances</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allRows.map((r) => (
              <AssetCard
                key={r.asset.id}
                asset={r.asset}
                balance={r.balance}
                loading={r.loading || (r.networkColor === "blue" ? isLoadingBase : isLoadingXrpl)}
                hidden={hidden}
                address={r.address}
                networkLabel={r.networkLabel}
                networkColor={r.networkColor}
              />
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
};
