import { cn } from "@/lib/utils";
import { CASH_NETWORKS, type SupportedAsset } from "@/data/supportedAssets";
import { useSelectedChain } from "@/contexts/SelectedChainContext";

interface ChainAssetPickerProps {
  variant?: "default" | "card";
  showAssets?: boolean;
}

export function ChainAssetPicker({
  variant = "default",
  showAssets = true,
}: ChainAssetPickerProps) {
  const { selectedChain, setSelectedChain, selectedAssetId, setSelectedAssetId, cashAssets } =
    useSelectedChain();
  const isCard = variant === "card";

  const tabClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
      isCard
        ? active
          ? "bg-primary-foreground text-primary"
          : "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
        : active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
    );

  const chipClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
      isCard
        ? active
          ? "bg-primary-foreground/25 text-primary-foreground ring-1 ring-primary-foreground/40"
          : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
        : active
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
    );

  return (
    <div className={isCard ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap gap-2">
        {CASH_NETWORKS.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setSelectedChain(n.id)}
            className={tabClass(selectedChain === n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>
      {showAssets && cashAssets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cashAssets.map((a: SupportedAsset) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedAssetId(a.id)}
              className={chipClass(selectedAssetId === a.id)}
            >
              {a.code}
            </button>
          ))}
        </div>
      )}
      {showAssets && cashAssets.length === 1 && (
        <p className={isCard ? "text-xs text-primary-foreground/70" : "text-xs text-muted-foreground"}>
          Receive as {cashAssets[0].code}
        </p>
      )}
    </div>
  );
}
