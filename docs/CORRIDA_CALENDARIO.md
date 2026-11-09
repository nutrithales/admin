# Corrida: calendário privado para Intervals.icu / Garmin

## Fluxo

O paciente abre `/paciente/corrida/garmin`, autoriza compartilhar o plano e gera um endereço privado. Adiciona esse endereço como calendário externo no Intervals.icu, marca **Events are workouts**, conecta Garmin e habilita **Upload planned workouts**. Não exige aplicativo OAuth ou API key do paciente.

O serviço publica iCalendar com descrições no formato de treinos do Intervals.icu, alvos absolutos em `/km Pace` e eventos all-day. Os UIDs por treino são estáveis. Revisões de conteúdo aumentam `SEQUENCE`, preservando a identificação no mesmo calendário. Cada consulta recalcula os alvos adaptáveis pela mesma regra da tela e preserva snapshots concluídos.

## Segurança e limites

- Token aleatório de 256 bits; só o SHA-256 é armazenado. URL aparece somente ao gerar e expira em 180 dias.
- A tabela `corrida_calendarios` não concede acesso a `anon`/`authenticated`. Código servidor usa service role somente após validar o paciente autenticado, administrador, ou hash do token para leitura do feed.
- Todas as consultas públicas restringem paciente, ciclos ativos e `liberar_em <= data atual em America/Sao_Paulo`. Há uma segunda verificação de status/revogação antes de devolver o feed.
- Sem nome, contato, avaliação, feedback ou medições de atividades no arquivo. Compartilha apenas a prescrição e seus alvos vigentes. Não importar atividades Garmin/Strava por esse mecanismo.
- Não registrar URL, token ou payload nos logs da aplicação. A URL é uma credencial de leitura: trate também os logs de infraestrutura como sensíveis. Não inclua a URL em analytics ou mensagens.
- Revogar ou substituir invalida imediatamente novas consultas ao link antigo. Cópias já importadas dependem da remoção do calendário no destino.
- A última consulta não comprova identidade de quem leu, sucesso no Garmin ou chegada ao relógio. Não mostrar estado “Garmin conectado” com base nela.
- Intervals.icu consulta calendários na frequência dele; não há SLA de liberação instantânea na virada do mês. O plano futuro não é exposto antecipadamente para contornar isso.
- Conferir no primeiro treino real se Intervals.icu/Forerunner 55 preservaram os alvos. Não houve validação física no relógio durante desenvolvimento.
- Provas contínuas usam distância por bloco. Caso um plano futuro contenha repetição por tempo até completar uma distância, o exportador conserva a distância total e sinaliza a estratégia em texto, sem inventar quantidade de repetições.

## Operação

Requer somente a `SUPABASE_SERVICE_ROLE_KEY` já existente no servidor. A URL usa a origem pública de produção `https://admin-nutri-thales.vercel.app`. Não é necessária tarefa cron: o consumidor busca o calendário atualizado. Não criar assinatura automaticamente sem a autorização da conta externa do paciente.

Admin acompanha em `/pacientes/[id]/corrida/garmin`. A URL secreta nunca é retornada na consulta administrativa.

## Fontes do provedor

- https://forum.intervals.icu/t/intervals-icu-news-2025-04-29/99720 — calendários externos com eventos-treinos podem ser enviados a Garmin.
- https://forum.intervals.icu/t/plan-the-training-calender-import-from-csv/51797 — leitura de descrições estruturadas de calendários iCal.
- https://forum.intervals.icu/t/specify-workouts-using-absolute-pace/115846 — pace absoluto, faixas e unidades explícitas.

## Verificação

`npm run typecheck`

`node scripts/test-running-calendar.mjs`

`node scripts/test-running-adaptive.mjs`

Verificar no banco a ausência de privilégios para anon/authenticated, ausência de links de teste persistidos e RLS ativo. O teste real final exige que o paciente gere a assinatura e confira o treino no próprio relógio.
