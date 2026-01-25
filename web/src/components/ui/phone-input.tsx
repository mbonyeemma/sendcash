import * as React from "react";
import { PhoneInput as BasePhoneInput, type PhoneInputProps as BasePhoneInputProps } from "react-international-phone";
import "react-international-phone/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<BasePhoneInputProps, "className" | "style"> {
  className?: string;
  error?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, error, ...props }, ref) => {
    // Check if className includes borderless styling
    const isBorderless = className?.includes("border-0") || className?.includes("border-b");
    
    return (
      <div className={cn("relative", className)}>
        <BasePhoneInput
          {...props}
          ref={ref}
          defaultCountry="ug"
          className={cn(
            isBorderless 
              ? "flex h-12 w-full border-0 border-b-2 rounded-none bg-transparent text-sm [&>div]:border-0 [&>div]:border-b-2 [&>div]:rounded-none [&>div]:bg-transparent [&>div]:shadow-none"
              : "flex h-12 w-full rounded-md border bg-background text-sm ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            isBorderless
              ? "focus-visible:outline-none focus-visible:ring-0 [&>div]:focus-within:border-primary [&>div]:focus-within:border-b-2"
              : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && (isBorderless ? "border-destructive [&>div]:border-destructive" : "border-destructive focus-visible:ring-destructive"),
            !error && !isBorderless && "border-input"
          )}
          style={{
            "--react-international-phone-text-color": "hsl(var(--foreground))",
            "--react-international-phone-border-color": error 
              ? "hsl(var(--destructive))" 
              : isBorderless
              ? "hsl(var(--border))"
              : "hsl(var(--input))",
            "--react-international-phone-selected-dropdown-item-background-color": "hsl(var(--primary))",
            "--react-international-phone-selected-dropdown-item-text-color": "hsl(var(--primary-foreground))",
            "--react-international-phone-hover-dropdown-item-background-color": "hsl(var(--muted))",
            ...(isBorderless && {
              "--react-international-phone-background-color": "transparent",
            }),
          } as React.CSSProperties}
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
