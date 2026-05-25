import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CASH_NETWORKS,
  getCashAssetsForNetwork,
  type AssetChain,
} from "@/data/supportedAssets";

interface NetworkAssetSelectProps {
  network: AssetChain;
  onNetworkChange: (network: AssetChain) => void;
  assetId: string;
  onAssetChange: (assetId: string) => void;
  /** Compact styling for the balance card gradient */
  variant?: "default" | "card";
  assetLabel?: string;
  networkLabel?: string;
}

export function NetworkAssetSelect({
  network,
  onNetworkChange,
  assetId,
  onAssetChange,
  variant = "default",
  assetLabel = "Asset",
  networkLabel = "Network",
}: NetworkAssetSelectProps) {
  const assets = getCashAssetsForNetwork(network);
  const isCard = variant === "card";

  const handleNetworkChange = (value: string) => {
    const next = value as AssetChain;
    onNetworkChange(next);
    const allowed = getCashAssetsForNetwork(next);
    if (!allowed.some((a) => a.id === assetId)) {
      onAssetChange(allowed[0]?.id ?? assetId);
    }
  };

  return (
    <div className={isCard ? "space-y-2" : "space-y-4"}>
      <div>
        <Label
          className={
            isCard
              ? "text-primary-foreground/70 text-xs font-medium mb-1.5 block"
              : "text-sm font-medium"
          }
        >
          {networkLabel}
        </Label>
        <Select value={network} onValueChange={handleNetworkChange}>
          <SelectTrigger
            className={
              isCard
                ? "w-full max-w-[220px] h-9 bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground text-sm"
                : "mt-1.5 h-11 bg-background"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CASH_NETWORKS.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label
          className={
            isCard
              ? "text-primary-foreground/70 text-xs font-medium mb-1.5 block"
              : "text-sm font-medium"
          }
        >
          {assetLabel}
        </Label>
        <Select value={assetId} onValueChange={onAssetChange}>
          <SelectTrigger
            className={
              isCard
                ? "w-full max-w-[220px] h-9 bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground text-sm"
                : "mt-1.5 h-11 bg-background"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assets.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
