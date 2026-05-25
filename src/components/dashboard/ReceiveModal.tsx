import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getCurrencyById, SEND_RECEIVE_CURRENCIES } from "@/data/currencies";
import { SUPPORTED_ASSETS, getSupportedAssetById } from "@/data/supportedAssets";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveModal = ({ isOpen, onClose }: ReceiveModalProps) => {
  const { isConnected, address } = useXRPLWallet();
  const [currencyId, setCurrencyId] = useState<string>("ugx");
  const [receiveAssetId, setReceiveAssetId] = useState("rlusd-xrpl");
  const receiveAsset = getSupportedAssetById(receiveAssetId);
  const currency = getCurrencyById(currencyId);
  const symbol = currency?.symbol ?? "UGX";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive crypto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium">Asset (XRPL)</Label>
            <Select value={receiveAssetId} onValueChange={setReceiveAssetId}>
              <SelectTrigger className="mt-1.5 h-11 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_ASSETS.filter((a) => a.chain === "xrpl").map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} · XRPL
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Cash out to (fiat)</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger className="mt-1.5 h-11 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEND_RECEIVE_CURRENCIES.map((id) => {
                  const c = getCurrencyById(id);
                  if (!c) return null;
                  return (
                    <SelectItem key={id} value={id}>
                      <span className="flex items-center gap-2">
                        <img src={c.logo} alt={c.symbol} className="w-5 h-4 object-contain rounded" />
                        {c.symbol}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {!isConnected ? (
            <p className="text-muted-foreground text-sm">
              Connect your XRPL wallet to see your receive address.
            </p>
          ) : address ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Send {receiveAsset?.code ?? "crypto"} to this address. You can then cash out to {symbol} via Send.
              </p>
              <div className="rounded-lg bg-muted p-3 font-mono text-sm break-all select-all">
                {address}
              </div>
              <p className="text-xs text-muted-foreground">
                Use your GemWallet or any XRPL wallet to send {receiveAsset?.code ?? "tokens"} to this address.
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
