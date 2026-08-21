# Hardening do diário legado

Status em 21/08/2026: **não remover as políticas públicas de `public.diario` ainda**.

## Motivo

A auditoria identificou duas páginas legadas que ainda acessam `public.diario` diretamente pelo REST do Supabase com a chave publicável, sem uma sessão autenticada do paciente:

- rota legada da Anna (`/paciente/diario/anna`);
- rota legada do Vinícius (`/paciente/diario/vinicius`).

Essas páginas usam IDs genéricos (por exemplo, chaves de configuração, datas e histórico semanal) na mesma tabela. Portanto, revogar as políticas públicas agora quebraria páginas em funcionamento e migrar registros antigos automaticamente sem comprovar a origem de cada linha pode atribuir dados ao paciente errado.

## Arquitetura segura já disponível

O admin já possui o fluxo autenticado em `/paciente/diario`, baseado em:

- `public.diario_configuracoes` — uma configuração por paciente;
- `public.diario_registros` — registros vinculados por `paciente_id` e data;
- RLS vinculando `pacientes.auth_id` ao `auth.uid()`;
- acesso administrativo por `is_admin()`.

## Estado observado

- Vinícius já possui configuração e registros no modelo novo autenticado.
- Anna ainda depende do legado e não possui configuração no modelo novo.

## Ordem segura de retirada

1. Validar visualmente o diário autenticado do Vinícius e confirmar que seus registros atuais estão completos.
2. Trocar a rota legada do Vinícius para o fluxo autenticado, preservando a URL pública de entrada se necessário.
3. Criar a configuração individual da Anna no admin a partir das metas/refeições corretas dela, sem copiar a configuração de outro paciente.
4. Migrar a Anna para o fluxo autenticado e validar leitura/escrita pelo login dela.
5. Tratar o conteúdo antigo de `public.diario` como arquivo legado até que a proveniência de cada linha possa ser determinada com segurança. Não atribuir registros ambíguos automaticamente.
6. Somente quando nenhuma página depender do legado: remover as políticas públicas de SELECT/INSERT/UPDATE de `public.diario`.
7. Depois de uma janela de validação, arquivar ou remover a tabela legada em migration separada e reversível.

## Critério de conclusão

A tabela `public.diario` só pode ser fechada quando:

- nenhuma aplicação fizer chamadas para `/rest/v1/diario`;
- Anna e Vinícius estiverem no fluxo autenticado;
- os registros novos forem gravados apenas em `diario_registros`;
- os testes de login, leitura, gravação e isolamento entre pacientes passarem.

Esse bloqueio é intencional para evitar regressão e, principalmente, risco de mistura de dados entre pacientes.
