"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ComboboxOption<T = unknown> {
  value: string;
  label: string;
  description?: string;
  /** Payload original (ex.: o `AlimentoOption` inteiro) — evita ter que
   * re-buscar os dados depois de selecionar. */
  data?: T;
}

export interface ComboboxProps<T = unknown> {
  value?: string;
  selectedLabel?: string;
  onChange: (value: string, option: ComboboxOption<T>) => void;
  onQueryChange: (query: string) => Promise<ComboboxOption<T>[]> | ComboboxOption<T>[];
  placeholder?: string;
  emptyMessage?: string;
  minChars?: number;
  debounceMs?: number;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Busca assíncrona com debounce — para escolher entre milhares de linhas
 * (ex. `alimentos`) onde um `<select>` nativo ou o filtro client-side do
 * DataTable não servem. `onQueryChange` normalmente chama uma Server Action
 * que faz `.ilike()` no Supabase com `limit(20)`.
 */
export function Combobox<T = unknown>({
  value,
  selectedLabel,
  onChange,
  onQueryChange,
  placeholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  minChars = 2,
  debounceMs = 250,
  error,
  disabled,
  className,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ComboboxOption<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < minChars) {
      setOptions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await onQueryChange(query.trim());
        setOptions(results);
        setHighlighted(0);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, minChars, debounceMs]);

  function select(option: ComboboxOption<T>) {
    onChange(option.value, option);
    setQuery("");
    setOptions([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[highlighted];
      if (option) select(option);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-light" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : (selectedLabel ?? query)}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-9 text-[15px] text-ink placeholder:text-muted-light transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50",
            error && "border-danger focus:border-danger focus:ring-danger/20",
          )}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-light" />
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-light" />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}

      {open && (
        <div className="absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1.5 shadow-dark animate-[modalIn_0.15s_ease-out]">
          {query.trim().length < minChars ? (
            <p className="px-4 py-2.5 text-sm text-muted-light">Digite pelo menos {minChars} caracteres...</p>
          ) : loading ? (
            <p className="px-4 py-2.5 text-sm text-muted-light">Buscando...</p>
          ) : options.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-muted-light">{emptyMessage}</p>
          ) : (
            options.map((option, i) => (
              <button
                key={option.value}
                type="button"
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => select(option)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors",
                  i === highlighted ? "bg-bg-alt" : "hover:bg-bg-alt",
                  option.value === value ? "font-semibold text-brand-dark" : "text-ink",
                )}
              >
                <span>{option.label}</span>
                {option.description && <span className="text-xs text-muted-light">{option.description}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
