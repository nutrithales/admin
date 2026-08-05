import Link from "next/link";
import {
  UserCheck,
  UserX,
  CalendarClock,
  AppWindow,
  UtensilsCrossed,
  BookOpen,
  Plus,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getDashboardStats,
  getRecentPacientes,
  getRecentLogins,
} from "@/services/dashboard.queries";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [stats, recentPacientes, recentLogins] = await Promise.all([
    getDashboardStats(),
    getRecentPacientes(),
    getRecentLogins(),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do seu consultório." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pacientes ativos" value={stats.pacientesAtivos} icon={UserCheck} />
        <StatCard label="Pacientes inativos" value={stats.pacientesInativos} icon={UserX} tone="muted" />
        <StatCard label="Consultas futuras" value={stats.consultasFuturas} icon={CalendarClock} />
        <StatCard
          label="Páginas personalizadas"
          value={stats.paginasPersonalizadas}
          icon={AppWindow}
          tone="ink"
        />
        <StatCard label="Planos alimentares" value={stats.planosAlimentares} icon={UtensilsCrossed} />
        <StatCard label="Conteúdos publicados" value={stats.conteudosBiblioteca} icon={BookOpen} tone="muted" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-bold text-ink">Últimos pacientes cadastrados</h2>
            <Link href="/pacientes" className="flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline">
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="px-6 pb-6">
            {recentPacientes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Nenhum paciente cadastrado ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentPacientes.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{p.nome}</p>
                      <p className="text-xs text-muted">{p.email}</p>
                    </div>
                    <Badge tone={p.status === "ativo" ? "success" : "muted"}>
                      {p.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6 pb-4">
            <h2 className="text-base font-bold text-ink">Atalhos rápidos</h2>
          </div>
          <div className="flex flex-col gap-2 px-6 pb-6">
            <QuickAction href="/pacientes?new=1" label="Novo paciente" />
            <QuickAction href="/planos-alimentares?new=1" label="Novo plano alimentar" />
            <QuickAction href="/paginas-personalizadas?new=1" label="Nova página personalizada" />
          </div>

          <div className="border-t border-border p-6">
            <h2 className="mb-3 text-base font-bold text-ink">Últimos logins</h2>
            {recentLogins.length === 0 ? (
              <p className="text-sm text-muted">Nenhum login registrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentLogins.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{p.nome}</span>
                    <span className="text-xs text-muted">
                      {p.last_login_at && new Date(p.last_login_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md border border-border px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-light"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-brand-light text-brand-dark">
        <Plus className="size-4" />
      </span>
      {label}
    </Link>
  );
}
