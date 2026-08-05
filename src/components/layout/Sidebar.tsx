"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { navItems } from "./nav-items";

export interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-300 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onCloseMobile}>
            <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-black text-ink-deep">
              NT
            </span>
            <span className="text-[15px] font-bold leading-tight text-ink">
              Nutri Thales Rosa
              <span className="block text-xs font-medium text-muted">Painel administrativo</span>
            </span>
          </Link>
          <button onClick={onCloseMobile} className="text-muted hover:text-ink lg:hidden" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] font-semibold transition-colors duration-200",
                  active ? "bg-brand text-ink-deep" : "text-muted hover:bg-bg-alt hover:text-ink",
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-lg bg-bg-alt-2 px-3 py-2.5 text-xs text-muted">
            Nutri Thales Rosa © {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
}
