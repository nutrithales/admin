"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, Settings, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

export interface TopbarProps {
  onOpenMobileMenu: () => void;
  adminName: string;
  adminEmail: string;
  adminPhotoUrl: string | null;
}

export function Topbar({ onOpenMobileMenu, adminName, adminEmail, adminPhotoUrl }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = adminName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
          <button className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-bg-alt">
            {adminPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={adminPhotoUrl}
                alt={adminName}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-ink-deep">
                {initials || <UserIcon className="size-4" />}
              </span>
            )}
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
