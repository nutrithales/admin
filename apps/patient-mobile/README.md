# Nutri Thales — App do Paciente

MVP em Expo/React Native conectado ao mesmo Supabase do ecossistema web.

## Teste no iPhone com Expo Go

1. Instale o app Expo Go no iPhone.
2. No computador, entre em `apps/patient-mobile`.
3. Copie `.env.example` para `.env`.
4. Rode `npm install`.
5. Rode `npx expo start`.
6. Escaneie o QR code com o iPhone e abra no Expo Go.

O computador e o iPhone devem estar na mesma rede local, salvo uso de tunnel do Expo.

## Funcionalidades atuais

- Login com Supabase Auth.
- Validação de vínculo com `pacientes.auth_id`.
- Sessão persistente no dispositivo.
- Home com nome, plano, objetivo e próxima consulta.
- Resumo do plano alimentar finalizado.
- Lista de treinos liberados pelo RLS.
- Histórico de check-ins.
- Perfil e logout.

## Segurança

O app utiliza apenas a chave publishable do Supabase. O acesso efetivo aos registros é controlado por RLS. Nunca adicionar `service_role` ou credenciais administrativas neste diretório.

## Próximas integrações

- Visualização completa das refeições e substituições.
- Execução de treino, séries, RIR e cronômetro.
- Resposta de check-in dentro do app.
- Materiais.
- Evolução/avaliações liberadas ao paciente.
- Push notifications.
- Build interno EAS/TestFlight/Android antes das lojas.
