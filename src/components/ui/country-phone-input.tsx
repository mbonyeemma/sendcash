import * as React from "react";
import { defaultCountries, parseCountry } from "react-international-phone";
import type { CountryData } from "react-international-phone";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface CountryOption {
  name: string;
  iso2: string;
  dialCode: string;
}

// Build country list once (name, iso2, dialCode only)
const COUNTRY_LIST: CountryOption[] = defaultCountries.map((c: CountryData) => {
  const p = parseCountry(c);
  return { name: p.name, iso2: p.iso2, dialCode: p.dialCode };
});

// Sort so we can match longest dial code first when parsing
const BY_DIAL_CODE_LENGTH = [...COUNTRY_LIST].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

function countryToFlag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  return [...iso2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

function parseValue(value: string): { country: CountryOption; national: string } {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) {
    return { country: COUNTRY_LIST.find((c) => c.iso2 === "ug") || COUNTRY_LIST[0], national: "" };
  }
  for (const country of BY_DIAL_CODE_LENGTH) {
    if (digits.startsWith(country.dialCode)) {
      const national = digits.slice(country.dialCode.length).replace(/\D/g, "");
      return { country, national };
    }
  }
  return { country: COUNTRY_LIST.find((c) => c.iso2 === "ug") || COUNTRY_LIST[0], national: digits };
}

function getDefaultCountry(iso2?: string): CountryOption {
  const lower = (iso2 || "ug").toLowerCase();
  return COUNTRY_LIST.find((c) => c.iso2 === lower) || COUNTRY_LIST.find((c) => c.iso2 === "ug") || COUNTRY_LIST[0];
}

export interface CountryPhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: string;
  className?: string;
  error?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const CountryPhoneInput = React.forwardRef<HTMLInputElement, CountryPhoneInputProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      defaultCountry = "ug",
      className,
      error,
      placeholder = "Phone number",
      disabled,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const parsed = React.useMemo(() => parseValue(value), [value]);
    const [selectedCountry, setSelectedCountry] = React.useState<CountryOption>(() =>
      value ? parsed.country : getDefaultCountry(defaultCountry)
    );
    const [nationalNumber, setNationalNumber] = React.useState(() =>
      value ? parsed.national : ""
    );

    // Sync from controlled value
    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        const { country, national } = parseValue(value);
        setSelectedCountry(country);
        setNationalNumber(national);
      }
    }, [value]);

    const emitChange = React.useCallback(
      (country: CountryOption, national: string) => {
        const digits = national.replace(/\D/g, "");
        const full = digits ? `+${country.dialCode}${digits}` : "";
        onChange?.(full);
      },
      [onChange]
    );

    const handleCountrySelect = (country: CountryOption) => {
      setSelectedCountry(country);
      setOpen(false);
      emitChange(country, nationalNumber);
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setNationalNumber(v);
      emitChange(selectedCountry, v);
    };

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const isBorderless = className?.includes("border-0") || className?.includes("border-b");
    const rootClass = isBorderless
      ? ""
      : "flex h-12 w-full rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2";

    return (
      <div
        className={cn(
          "relative flex h-12 w-full",
          rootClass,
          error && "border-destructive focus-within:ring-destructive",
          className
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-12 shrink-0 gap-1.5 rounded-none border-0 border-r border-input bg-transparent px-3 hover:bg-muted/50",
                isBorderless && "border-b-0 border-r-border"
              )}
              disabled={disabled}
            >
              <span className="text-lg leading-none" aria-hidden>
                {countryToFlag(selectedCountry.iso2)}
              </span>
              <span className="text-sm font-medium">+{selectedCountry.dialCode}</span>
              <ChevronDown className={cn("h-4 w-4 opacity-50", open && "rotate-180")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={true}>
              <CommandInput placeholder="Search country or code..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRY_LIST.map((country) => (
                    <CommandItem
                      key={country.iso2}
                      value={`${country.name} +${country.dialCode} ${country.iso2}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">{countryToFlag(country.iso2)}</span>
                      <span className="flex-1 truncate">{country.name}</span>
                      <span className="text-muted-foreground">+{country.dialCode}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={nationalNumber}
          onChange={handleNationalChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-0 h-full px-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0",
            isBorderless && "border-b-2 border-border rounded-none"
          )}
        />
      </div>
    );
  }
);

CountryPhoneInput.displayName = "CountryPhoneInput";

export { CountryPhoneInput };
