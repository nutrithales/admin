"use client";

import Link from "next/link";
import { Home, LayoutDashboard, RefreshCw, Utensils, Info } from "lucide-react";

export default function PlanoAlimentarLayout({ children }: { children: React.ReactNode }) {
  const irPara = (id?: string) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="plano-paciente-wrapper">
      <style>{`
        .plano-paciente-wrapper nav[aria-label="Navegação do plano"] {
          display: none !important;
        }
      `}</style>

      {children}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-10px_30px_rgba(4,20,12,0.10)] backdrop-blur-xl sm:hidden"
        aria-label="Navegação global do plano"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <NavButton onClick={() => irPara()} icon={Home} label="Início" />
          <NavButton onClick={() => irPara("refeicoes")} icon={Utensils} label="Refeições" />
          <NavButton onClick={() => irPara("substituicoes")} icon={RefreshCw} label="Trocas" />
          <NavButton onClick={() => irPara("orientacoes")} icon={Info} label="Orientações" />
          <Link
            href="/paciente"
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-black text-muted transition active:bg-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <LayoutDashboard className="size-5" />
            <span>Área</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function NavButton({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Home; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-black text-muted transition active:bg-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </button>
  );
}
