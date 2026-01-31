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
    const isBorderless = className?.includes("border-0") || className?.includes("border-b");

    // Single outer border so country selector + input look merged (matches AmountItem)
    const mergedWrapperClass =
      "flex h-12 w-full rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2";
    const mergedInnerClass =
      "flex h-full w-full [&>div]:!border-0 [&>div]:!shadow-none [&>div]:!rounded-none [&>div]:bg-transparent [&_input]:!border-0 [&_input]:!rounded-none [&_input]:!ring-0 [&_input]:!outline-none";

    return (
      <div
        className={cn(
          "relative",
          !isBorderless && mergedWrapperClass,
          error && "border-destructive focus-within:ring-destructive",
          className
        )}
      >
        <BasePhoneInput
          {...props}
          ref={ref}
          defaultCountry="ug"
          className={cn(
            isBorderless
              ? "flex h-12 w-full border-0 border-b-2 rounded-none bg-transparent text-sm [&>div]:border-0 [&>div]:border-b-2 [&>div]:rounded-none [&>div]:bg-transparent [&>div]:shadow-none"
              : cn(mergedInnerClass, "h-full text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"),
            "file:border-0 file:bg-transparent file:text-sm file:font-medium"
          )}
          style={{
            "--react-international-phone-text-color": "hsl(var(--foreground))",
            "--react-international-phone-border-color": "transparent",
            "--react-international-phone-selected-dropdown-item-background-color": "hsl(var(--primary))",
            "--react-international-phone-selected-dropdown-item-text-color": "hsl(var(--primary-foreground))",
            "--react-international-phone-hover-dropdown-item-background-color": "hsl(var(--muted))",
            ...(isBorderless && {
              "--react-international-phone-border-color": "hsl(var(--border))",
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
