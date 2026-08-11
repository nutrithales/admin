@AGENTS.md

# Clara — Secretária Virtual

Este painel tem um módulo de assistente operacional ("Clara") em `/clara`,
documentado em detalhe em `docs/CLARA.md`. Pontos que **sempre** valem ao
mexer nesse módulo (ou em qualquer código que ele toca — planos, consultas,
check-ins, Fluxo):

- **Toda decisão clínica é do nutricionista Thales.** A Clara nunca
  prescreve, interpreta exame, sugere conduta ou decide o plano alimentar
  de um paciente. Prontuário (`consulta_prontuarios`) e avaliações físicas
  (`avaliacoes_fisicas`) ficam sempre fora do alcance dela.
- **Nenhuma mensagem é enviada automaticamente.** Modelos em
  `mensagens_modelos` só são preenchidos para revisão e cópia manual
  (WhatsApp/e-mail continuam sendo enviados por uma pessoa).
- **Ações destrutivas exigem confirmação explícita e nível "admin".**
  Excluir paciente definitivamente, por exemplo, é bloqueado para
  `administradores.nivel = 'secretaria'` tanto no servidor
  (`assertPermission`) quanto em RLS.
- **Consultas realizadas nunca são um contador armazenado** — sempre
  recalculadas a partir do histórico real (`computeConsultasStats` em
  `src/lib/clara/consultas.ts`). Não crie um campo separado para isso.
- Rotas do painel não usam prefixo `/admin` (o grupo `(admin)` já mapeia
  para a raiz) — siga esse padrão em qualquer página nova.
