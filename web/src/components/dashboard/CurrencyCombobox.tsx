import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface CurrencyComboboxOption {
  id: string;
  symbol: string;
  name?: string;
  logo: string;
}

interface CurrencyComboboxProps {
  value: string;
  onChange: (id: string) => void;
  options: CurrencyComboboxOption[];
  triggerClassName?: string;
  placeholder?: string;
}

/** Searchable currency/country picker, sorted alphabetically by name (falls back to symbol). */
export function CurrencyCombobox({
  value,
  onChange,
  options,
  triggerClassName,
  placeholder = "Select currency",
}: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const sorted = [...options].sort((a, b) =>
    (a.name || a.symbol).localeCompare(b.name || b.symbol)
  );
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex items-center gap-1.5 h-9 rounded-md border-0 bg-transparent px-2 text-sm font-medium hover:bg-muted/80 transition-colors",
            triggerClassName
          )}
        >
          {selected ? (
            <>
              <img src={selected.logo} alt={selected.symbol} className="w-5 h-4 object-contain rounded" />
              <span>{selected.symbol}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search country or currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.name ?? ""} ${o.symbol}`}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <img src={o.logo} alt={o.symbol} className="w-5 h-4 object-contain rounded mr-2" />
                  <span className="flex-1">{o.name ?? o.symbol}</span>
                  <span className="text-xs text-muted-foreground mr-2">{o.symbol}</span>
                  <Check className={cn("h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
