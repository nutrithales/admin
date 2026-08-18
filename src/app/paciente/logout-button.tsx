"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PatientLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    window.location.href = "/paciente/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Sair da Área do Paciente"
      title="Sair"
      className="flex h-9 items-center gap-1.5 rounded-full border border-[#DDE4DF] bg-white px-3 text-[10px] font-black text-[#5F6B64] shadow-[0_5px_16px_rgba(14,26,20,0.04)] transition active:scale-[0.98] disabled:opacity-60"
    >
      <LogOut className="size-[14px]" />
      {loading ? "Saindo" : "Sair"}
    </button>
  );
}
