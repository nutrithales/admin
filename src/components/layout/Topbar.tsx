"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

export interface TopbarProps {
  onOpenMobileMenu: () => void;
  adminName: string;
  adminEmail: string;
  adminPhotoUrl: string | null;
}

export function Topbar({ onOpenMobileMenu, adminName, adminEmail }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMobileMenu}
        className="rounded-full p-2 text-ink hover:bg-bg-alt lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block" />

      <Dropdown
        trigger={
          <button className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-3 transition-colors hover:bg-bg-alt">
            <span className="flex h-9 min-w-11 items-center justify-center rounded-lg bg-bg-alt px-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND_LOGO_DATA_URI}
                alt="Thales Rosa Nutricionista"
                className="h-8 w-auto object-contain"
              />
            </span>
            <span className="hidden text-sm font-semibold text-ink sm:block">{adminName}</span>
          </button>
        }
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-ink">{adminName}</p>
          <p className="truncate text-xs text-muted">{adminEmail}</p>
        </div>
        <Link href="/configuracoes">
          <DropdownItem>
            <Settings className="size-4" /> Configurações
          </DropdownItem>
        </Link>
        <DropdownItem onClick={handleLogout} className="text-danger hover:bg-red-50">
          <LogOut className="size-4" /> Sair
        </DropdownItem>
      </Dropdown>
    </header>
  );
}
