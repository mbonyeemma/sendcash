import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { walletApi } from "@/services/api";
import { xrplService } from "@/services/xrplService";
import { baseService } from "@/services/baseService";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import { getCurrencyById } from "@/data/currencies";
import { SUPPORTED_ASSETS, type SupportedAsset } from "@/data/supportedAssets";

interface BalanceRow {
  asset: SupportedAsset;
  balance: string;
  isLoading: boolean;
}

export const BalanceView = () => {
  const { isConnected, address, network } = useXRPLWallet();
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();
  const [hidden, setHidden] = useState(false);
  const [rows, setRows] = useState<BalanceRow[]>(() =>
    SUPPORTED_ASSETS.map((asset) => ({
      asset,
      balance: "0",
      isLoading: true,
    }))
  );

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [isConnected, address, evmConnected, evmAddress]);

  const setRowBalance = (assetId: string, balance: string, loading: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.asset.id === assetId ? { ...r, balance, isLoading: loading } : r
      )
    );
  };

  const fetchBalances = async () => {
    for (const asset of SUPPORTED_ASSETS) {
      if (asset.chain === "xrpl") {
        if (isConnected && address) {
          try {
            const xrplBalances = await xrplService.getAccountBalances(address, network || "Mainnet");
            if (asset.code === "XRP") {
              const x = xrplBalances.find((b) => b.currency === "XRP");
              setRowBalance(asset.id, x?.value ?? "0", false);
            } else if (asset.code === "RLUSD") {
              const t = xrplBalances.find(
                (b) =>
                  xrplService.formatCurrency(b.currency) === "RLUSD" ||
                  b.currency === "RLUSD"
              );
              setRowBalance(asset.id, t?.value ?? "0", false);
            }
          } catch (error: unknown) {
            console.error(`Failed to fetch ${asset.code} balance:`, error);
            try {
              const res = await walletApi.getBalance(asset.code);
              const v = res.data?.balance ?? res.data?.data?.balance;
              setRowBalance(asset.id, String(v ?? "0"), false);
            } catch {
              setRowBalance(asset.id, "0", false);
            }
          }
        } else {
          try {
            const res = await walletApi.getBalance(asset.code);
            const v = res.data?.balance ?? res.data?.data?.balance;
            setRowBalance(asset.id, String(v ?? "0"), false);
          } catch {
            setRowBalance(asset.id, "0", false);
          }
        }
        continue;
      }

      if (asset.chain === "base") {
        if (evmConnected && evmAddress && asset.contractAddress) {
          try {
            const bal = await baseService.getErc20Balance(
              evmAddress,
              asset.contractAddress,
              asset.decimals
            );
            setRowBalance(asset.id, bal, false);
          } catch (e: unknown) {
            console.error(`Base ${asset.code} balance:`, e);
            setRowBalance(asset.id, "0", false);
          }
        } else {
          setRowBalance(asset.id, "0", false);
        }
      }
    }
  };

  const formatAmount = (val: string | number, currency: string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.00";

    if (currency === "UGX" || currency === "KES") {
      return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Balances</h1>
          <p className="text-sm text-muted-foreground mt-1">View your account balances</p>
        </div>
        <button
          onClick={() => setHidden(!hidden)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {hidden ? <Eye className="w-5 h-5 text-muted-foreground" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map(({ asset, balance, isLoading }) => {
          const lookupId =
            asset.chain === "base"
              ? asset.code === "USDC"
                ? "usdc-base"
                : "usdt-base"
              : asset.code.toLowerCase();
          const currencyInfo = getCurrencyById(lookupId) || getCurrencyById(asset.code.toLowerCase());
          const networkLabel = asset.chain === "base" ? "Base" : "XRPL";

          return (
            <div
              key={asset.id}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {currencyInfo?.logo && (
                    <img
                      src={currencyInfo.logo}
                      alt={asset.code}
                      className="w-10 h-10 object-contain rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{asset.code}</p>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    asset.chain === "base"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {networkLabel}
                </span>
              </div>

              <div className="mt-4">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {hidden ? "••••••" : formatAmount(balance, asset.code)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {asset.code} · {networkLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
