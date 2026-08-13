"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { executarComandoAction, type ComandoResposta } from "@/services/clara.actions";
import { COMANDOS_SUGERIDOS } from "@/lib/clara/comandos";

interface Mensagem {
  autor: "voce" | "clara";
  texto?: string;
  resposta?: ComandoResposta;
}

export function ComandosBox() {
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(comando?: string) {
    const mensagem = (comando ?? texto).trim();
    if (!mensagem) return;
    setHistorico((prev) => [...prev, { autor: "voce", texto: mensagem }]);
    setTexto("");
    setEnviando(true);
    try {
      const resposta = await executarComandoAction(mensagem);
      setHistorico((prev) => [...prev, { autor: "clara", resposta }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Sparkles className="size-4 text-brand-dark" />
        <h2 className="text-base font-bold text-ink">Caixa de comandos</h2>
      </div>

      <div className="flex max-h-96 min-h-40 flex-col gap-3 overflow-y-auto p-4 scrollbar-thin">
        {historico.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Experimente perguntar:</p>
            <div className="flex flex-wrap gap-2">
              {COMANDOS_SUGERIDOS.slice(0, 5).map((sugestao) => (
                <button
                  key={sugestao}
                  onClick={() => void enviar(sugestao)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-brand-dark"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>
        )}

        {historico.map((msg, i) =>
          msg.autor === "voce" ? (
            <div key={i} className="self-end rounded-lg rounded-br-sm bg-brand px-3.5 py-2 text-sm font-medium text-ink-deep">
              {msg.texto}
            </div>
          ) : (
            <div key={i} className="self-start rounded-lg rounded-bl-sm border border-border bg-bg-alt-2 px-3.5 py-2.5 text-sm text-ink">
              <p className="font-semibold">{msg.resposta!.titulo}</p>
              {msg.resposta!.itens.length === 0 ? (
                <p className="mt-1 text-muted">{msg.resposta!.vazio}</p>
              ) : (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {msg.resposta!.itens.map((item, j) => (
                    <li key={j} className="text-muted">
                      • {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}

        {enviando && <div className="self-start text-sm text-muted">Mar.ia está buscando os dados...</div>}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mar.ia, organize meu dia..."
          disabled={enviando}
        />
        <Button type="submit" size="sm" disabled={enviando || !texto.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
