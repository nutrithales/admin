import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-brand text-ink-deep shadow-brand hover:bg-brand-dark hover:text-white",
  secondary: "bg-ink text-white hover:bg-ink/90",
  outline: "border-2 border-ink text-ink bg-transparent hover:bg-ink hover:text-white",
  ghost: "bg-transparent text-ink hover:bg-bg-alt",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-sm px-4 py-2 gap-1.5",
  md: "text-[15px] px-5 py-2.5 gap-2",
  lg: "text-base px-6 py-3.5 gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 ease-out",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
