"use client";

import { cn } from "@/utils/cn";

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            "relative shrink-0 px-4 py-2.5 text-sm font-semibold transition-colors",
            item.key === value ? "text-brand-dark" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
          {item.key === value && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  );
}
