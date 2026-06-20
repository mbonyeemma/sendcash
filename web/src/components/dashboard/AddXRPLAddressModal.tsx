import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { XrplFavorite } from "@/components/dashboard/SendCryptoModal";

interface AddXRPLAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional pre-filled address (e.g. when user pasted in "New address" then clicked Save) */
  initialAddress?: string;
  onSave: (favorite: XrplFavorite) => void;
}

const XRPL_ADDRESS_MIN_LENGTH = 25;

export const AddXRPLAddressModal = ({
  open,
  onOpenChange,
  initialAddress = "",
  onSave,
}: AddXRPLAddressModalProps) => {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState(initialAddress);

  useEffect(() => {
    if (open) {
      setAddress(initialAddress);
      setLabel("");
    }
  }, [open, initialAddress]);

  const reset = () => {
    setLabel("");
    setAddress(initialAddress);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const trimmedAddress = address.trim();
    if (trimmedAddress.length < XRPL_ADDRESS_MIN_LENGTH) {
      toast.error("Please enter a valid XRPL address");
      return;
    }
    const newFavorite: XrplFavorite = {
      id: `fav_${Date.now()}`,
      label: label.trim() || `Address ${trimmedAddress.slice(0, 8)}...`,
      address: trimmedAddress,
    };
    onSave(newFavorite);
    toast.success("Address saved to favorites");
    handleOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save XRPL address</DialogTitle>
          <DialogDescription className="sr-only">
            Enter an XRPL address and optional label to save to favorites.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="address">XRPL address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="font-mono text-sm h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My wallet"
              className="h-12"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={address.trim().length < XRPL_ADDRESS_MIN_LENGTH}>
            Save address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
