import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border border-[var(--color-notion-border)] bg-[var(--color-notion-bg-primary)] px-4 py-3 text-base text-[var(--color-notion-text-primary)] placeholder:text-[var(--color-notion-text-muted)] focus-visible:outline-none focus-visible:border-[var(--color-notion-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
