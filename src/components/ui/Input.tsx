import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const fieldStyles =
  "w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted-light transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(fieldStyles, error && "border-danger focus:border-danger focus:ring-danger/20", className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <textarea
      ref={ref}
      className={cn(fieldStyles, "min-h-24 resize-y", error && "border-danger focus:border-danger focus:ring-danger/20", className)}
      {...props}
    />
    {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col", className)} {...props} />;
}
