# ⚡ Level Fit

Duelo de hábitos saudáveis entre 2 pessoas. O app sugere metas, cada prova de hábito é uma **foto**, e existe ranking **diário, semanal e mensal** com animação de vitória para o vencedor. O placar também aparece num **widget** na tela inicial (iOS e Android).

Identidade visual em [`docs/brand`](docs/brand/brand-board.png), com o mascote **Kettu**.

Feito com **React Native + Expo SDK 58** (Expo Router, Reanimated, `expo-widgets`).

## Funcionalidades

| | |
|---|---|
| 🎯 **Metas sugeridas** | 4 pacotes prontos (Equilíbrio, Modo Shape, Mente Zen, Primeiros Passos) ou monte o seu com 15 hábitos: ler 10 páginas, 2L de água, refeições da dieta (até 3/dia), treino de 30 min, 10 mil passos, dormir 7h+, zero açúcar, meditar, alongar, frutas, sem tela antes de dormir, acordar cedo, ar livre, diário de gratidão e zero álcool. |
| 📸 **Prova com foto** | Toda meta precisa de foto (câmera ou galeria) com legenda opcional. |
| ⚡ **Desafio do dia** | Um hábito bônus fora das metas que vale **2x**. Os dois aparelhos sorteiam o mesmo. |
| 🏆 **Rankings** | Diário, semanal (segunda a domingo) e mensal, com pódio animado, placar de vitórias e histórico. |
| 🎉 **Animação de vitória** | Quando um dia, uma semana ou um mês termina, o app comemora na abertura seguinte com troféu, confete e háptico. O botão no histórico repete a animação. |
| 🔥 **Combo e bônus** | Sequência de 3, 7 ou 14 dias multiplica os pontos por 1.1, 1.25 ou 1.5. Dia perfeito dá +30. |
| 💸 **Aposta** | Ex.: "um açaí". Quem perde a semana ou o mês paga, e a tela de vitória lembra. |
| 🤨 **Contestar prova** | O rival pode contestar uma foto suspeita. Prova contestada não pontua até ser aceita. |
| 😂 **Reações** | 🔥 💪 👏 😂 🤨 nas provas do feed. |
| 🧬 **Níveis e conquistas** | XP = pontos totais, com níveis e títulos (de "Sofá Lover" até "Lenda") e 15 conquistas. |
| 🔔 **Lembretes** | Notificações locais às 12:30 e num horário escolhido à noite. |
| 📱 **Widget** | Placar do dia, metas feitas e sequência. iOS: pequeno, médio, grande e tela de bloqueio. Android: 4x2. |

## Modos de jogo

- **No mesmo celular (offline):** os dois jogadores usam o mesmo aparelho e escolhem quem está postando na tela "Hoje". Não precisa configurar nada.
- **Online (cada um no seu celular):** usa o [Supabase](https://supabase.com) (login anônimo, banco, storage privado para as fotos e realtime). Um cria o duelo e o outro entra com o código de 6 letras.

### Configurar o modo online

1. Crie um projeto no Supabase e ative **Authentication → Sign In / Providers → Anonymous sign-ins**.
2. Rode [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor. Ele cria as tabelas, o RLS, as funções `create_duel`/`join_duel`, o realtime e o bucket `proofs`.
3. Copie `.env.example` para `.env` e preencha a URL e a anon key.

## Rodando

```bash
npm install
```

O widget, a câmera e as notificações precisam de uma *development build* (o Expo Go não inclui `expo-widgets`):

```bash
npx expo run:android
```

```bash
npx expo run:ios
```

Também dá para gerar a build na nuvem, sem Xcode ou Android Studio:

```bash
npx eas-cli@latest build --profile development
```

Para ver a interface rapidamente no navegador (sem widget e sem câmera, mas com upload pela galeria):

```bash
npx expo start --web
```

### Adicionando o widget
Segure a tela inicial, toque em **Widgets** (Android) ou **+** (iOS) e escolha **Level Fit — Placar**.

## Scripts

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

## Estrutura

```
src/
  app/                 telas (Expo Router)
    (tabs)/            Hoje · Ranking · Provas · Perfil
    onboarding.tsx     criação do jogador, modo, metas e aposta
    checkin/[habitId]  postar prova com foto
    proof/[id]         ver prova, reagir, contestar, apagar
    goals.tsx          editar metas e aposta
  domain/              regras puras e testadas (hábitos, datas, pontuação, níveis)
  store/useGame.ts     estado (zustand + AsyncStorage), otimista com fila de sync
  sync/                backend local e Supabase
  widgets/             widget SwiftUI (iOS) e Jetpack Compose (Android)
  components/          UI, placar VS, cards, confete, comemoração
supabase/schema.sql    banco do modo online
```

## Observações

- O placar é sempre **recalculado a partir dos check-ins**, então os dois aparelhos chegam ao mesmo resultado. Por isso, mudar as metas recalcula também os dias anteriores.
- No modo online, as fotos ficam num bucket privado e são exibidas com URLs assinadas (7 dias). Suas próprias fotos também ficam salvas no aparelho.
- Check-ins feitos sem internet ficam na fila e sobem no próximo sync. Para forçar, puxe a tela para baixo.
