"use client";

import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PatientProfileMenu({ initial }: { initial: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/paciente/login";
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir menu do perfil"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-[#0E1A14] text-[12px] font-black text-white shadow-[0_6px_18px_rgba(14,26,20,0.12)] transition active:scale-[0.96]"
      >
        {initial}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-[154px] overflow-hidden rounded-[16px] border border-black/[0.06] bg-white p-1.5 shadow-[0_16px_40px_rgba(14,26,20,0.14)]">
          <div className="flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-[#7A857F]">
            <UserRound className="size-3.5" /> Minha conta
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex w-full items-center gap-2 rounded-[11px] px-2.5 py-2.5 text-left text-[11px] font-black text-[#26312B] transition hover:bg-[#F3F6F4] active:bg-[#EEF2EF] disabled:opacity-60"
          >
            <LogOut className="size-3.5 text-[#159F60]" />
            {loading ? "Saindo..." : "Sair"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
