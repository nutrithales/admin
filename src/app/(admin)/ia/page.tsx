import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { listHistoricoIa } from "@/services/ia.queries";

export const metadata = { title: "IA" };

export default async function IaPage() {
  const historico = await listHistoricoIa();

  return (
    <div>
      <PageHeader
        title="IA"
        description="A geração de respostas ainda não está implementada — esta tela mostra o histórico já registrado em `historico_ia` para os pacientes que já usaram o recurso em outra parte da plataforma."
      />

      {historico.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum histórico de IA ainda"
          description="Quando pacientes interagirem com o assistente de IA, as perguntas e respostas aparecerão aqui."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {historico.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  {item.paciente?.nome ?? "Paciente desconhecido"}
                </span>
                <span className="text-xs text-muted">
                  {item.created_at && new Date(item.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-sm font-medium text-ink">{item.pergunta}</p>
              <p className="mt-1 text-sm text-muted">{item.resposta}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
