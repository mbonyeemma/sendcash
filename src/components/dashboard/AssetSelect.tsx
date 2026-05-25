import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelectedChain } from "@/contexts/SelectedChainContext";

interface AssetSelectProps {
  label?: string;
  className?: string;
}

/** Inline asset chips for the globally selected chain */
export function AssetSelect({ label = "Asset", className }: AssetSelectProps) {
  const { cashAssets, selectedAssetId, setSelectedAssetId } = useSelectedChain();

  if (cashAssets.length <= 1) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {label}: {cashAssets[0]?.code}
      </p>
    );
  }

  return (
    <div className={className}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2 mt-1.5">
        {cashAssets.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedAssetId(a.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              selectedAssetId === a.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {a.code}
          </button>
        ))}
      </div>
    </div>
  );
}
