"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-surface/90 px-4 py-2 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMobileMenu}
        className="rounded-full p-2 text-ink hover:bg-bg-alt lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex max-w-[760px] items-center justify-end gap-3 text-right">
        <p className="hidden text-[12px] font-medium italic leading-relaxed text-muted sm:block lg:text-[13px]">
          “Entrega o teu caminho ao Senhor; confia nele, e ele o fará.”
        </p>

        <Dropdown
          trigger={
            <button
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg-alt hover:text-ink"
              aria-label="Abrir opções da conta"
              title="Conta e configurações"
            >
              <Settings className="size-4" />
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
      </div>
    </header>
  );
}
