import { cn } from "@/lib/utils";
import { useSelectedChain } from "@/contexts/SelectedChainContext";
import type { AssetChain } from "@/data/supportedAssets";

const CHAINS: { id: AssetChain; label: string }[] = [
  { id: "base", label: "Base" },
  { id: "xrpl", label: "XRP" },
];

interface ChainToggleProps {
  className?: string;
  size?: "sm" | "default";
}

/** Global network switch — drives balances, cash-in, and cash-out */
export function ChainToggle({ className, size = "default" }: ChainToggleProps) {
  const { selectedChain, setSelectedChain } = useSelectedChain();

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/50 p-0.5",
        size === "sm" && "text-xs",
        className
      )}
      role="tablist"
      aria-label="Selected network"
    >
      {CHAINS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={selectedChain === c.id}
          onClick={() => setSelectedChain(c.id)}
          className={cn(
            "px-3 py-1.5 rounded-md font-medium transition-colors",
            size === "sm" && "px-2.5 py-1 text-xs",
            selectedChain === c.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
