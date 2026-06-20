import * as React from "react";
import { CountryPhoneInput } from "@/components/ui/country-phone-input";

// Re-export the custom component so existing imports keep working
export type { CountryPhoneInputProps } from "@/components/ui/country-phone-input";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: string;
  className?: string;
  error?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (props, ref) => <CountryPhoneInput ref={ref} {...props} />
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
