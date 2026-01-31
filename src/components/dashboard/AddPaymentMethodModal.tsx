import { useState } from "react";
import { Loader2, Smartphone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { paymentMethodApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddPaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const initialForm = {
  account_name: "",
  phone_number: "",
  country_code: "256",
  network: "MTN",
  bank_name: "",
  account_number: "",
  currency: "UGX",
  address: "",
};

export const AddPaymentMethodModal = ({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentMethodModalProps) => {
  const [type, setType] = useState<"MOBILE" | "BANK">("MOBILE");
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.account_name.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (type === "MOBILE" && !form.phone_number.trim()) {
      toast.error("Phone number is required for Mobile Money");
      return;
    }
    if (type === "BANK" && (!form.account_number.trim() || !form.bank_name.trim())) {
      toast.error("Bank name and account number are required");
      return;
    }
    try {
      setIsLoading(true);
      const payload: Record<string, string> = {
        type,
        currency: form.currency,
        account_name: form.account_name.trim(),
      };
      if (form.address?.trim()) {
        payload.bank_address = form.address.trim();
      }
      if (type === "MOBILE") {
        payload.phone_number = form.phone_number.replace(/\s/g, "").trim();
        payload.country_code = form.country_code;
        payload.network = form.network;
      } else {
        payload.account_number = form.account_number.trim();
        payload.bank_name = form.bank_name.trim();
      }
      const response = await paymentMethodApi.addPaymentMethod(payload);
      if (response.status === 201 || response.status === 200) {
        toast.success("Payment method added");
        setForm(initialForm);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to add payment method");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add payment method</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "MOBILE" | "BANK")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MOBILE" className="gap-2">
                  <Smartphone className="w-4 h-4 inline mr-2" />
                  Mobile Money
                </SelectItem>
                <SelectItem value="BANK" className="gap-2">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Bank account
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Account / recipient name</Label>
            <Input
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              placeholder="e.g. John Doe"
              className="mt-1.5"
            />
          </div>
          {type === "MOBILE" && (
            <>
              <div>
                <Label>Phone number</Label>
                <PhoneInput
                  value={form.phone_number}
                  onChange={(v) => setForm({ ...form, phone_number: v })}
                  defaultCountry="UG"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Network</Label>
                <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                    <SelectItem value="Airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {type === "BANK" && (
            <>
              <div>
                <Label>Bank name</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g. Stanbic Bank"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Account number</Label>
                <Input
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  placeholder="Account number"
                  className="mt-1.5"
                />
              </div>
            </>
          )}
          <div>
            <Label>Address (optional)</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. physical address or reference"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">Saved with this payment method for reference.</p>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
