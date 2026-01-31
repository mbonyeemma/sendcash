import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrencyById } from "@/data/currencies";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Currency user selected to receive (ugx, kes, tzs) - for display only */
  currencyId?: string;
}

export const ReceiveModal = ({ isOpen, onClose, currencyId = "ugx" }: ReceiveModalProps) => {
  const { isConnected, address } = useXRPLWallet();
  const currency = getCurrencyById(currencyId);
  const symbol = currency?.symbol ?? "UGX";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currency && (
              <img src={currency.logo} alt={currency.symbol} className="w-6 h-4 object-contain rounded" />
            )}
            Receive RLUSD → {symbol}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isConnected ? (
            <p className="text-muted-foreground text-sm">
              Connect your XRPL wallet to see your receive address and get RLUSD.
            </p>
          ) : address ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Send RLUSD to this address. You can then cash out to {symbol} via Send.
              </p>
              <div className="rounded-lg bg-muted p-3 font-mono text-sm break-all select-all">
                {address}
              </div>
              <p className="text-xs text-muted-foreground">
                Use your GemWallet or any XRPL wallet to send RLUSD to this address.
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
