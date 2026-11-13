# ⚡ Level Fit

Duelo de hábitos saudáveis entre 2 pessoas. O app sugere metas, cada prova de hábito é uma **foto**, e existe ranking **diário, semanal e mensal** com animação de vitória para o vencedor. O placar também aparece num **widget** na tela inicial (iOS e Android).

Identidade visual em [`docs/brand`](docs/brand/brand-board.png), com o mascote **Brasa**, um lutador de fogo em guarda.

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
| 🧬 **Níveis e conquistas** | XP = pontos totais, com níveis e ranks de lutador (de "Saco de Pancada" até "Lenda do Ringue") e 15 conquistas. |
| 🔔 **Lembretes** | Notificações locais às 12:30 e num horário escolhido à noite. |
| 📱 **Widget** | Placar do dia, metas feitas e sequência. iOS: pequeno, médio, grande e tela de bloqueio. Android: 4x2. |

## Como funciona

1. **Crie uma conta** com e-mail e senha, escolhendo nome, avatar e cor.
2. Na **tela inicial** aparecem todos os seus duelos, com o placar do dia de cada um.
3. **Novo duelo:** escolha as metas e a aposta. Você recebe um código de 6 letras para mandar pro rival.
4. **Entrar:** digite o código que alguém te mandou.
5. Toque num duelo para abrir as abas **Hoje · Ranking · Provas · Duelo**.

Você pode ter quantos duelos quiser ao mesmo tempo, cada um com outra pessoa, outras metas e outra aposta. Cada duelo tem 2 jogadores. Tudo fica no [Supabase](https://supabase.com) (auth, banco, storage privado para as fotos e realtime), então dá para entrar de qualquer celular.

### Configurar o Supabase

1. Crie um projeto no Supabase. Em **Authentication → Sign In / Providers**, deixe **Email** habilitado. Para testar sem precisar confirmar o e-mail, desligue **Confirm email**.
2. Rode [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor. Ele cria as tabelas, o RLS, as funções `create_duel`/`join_duel`, o realtime e o bucket `proofs`, e pode ser rodado de novo sem problema.
3. Copie `.env.example` para `.env` e preencha a URL e a publishable key (Project Settings → API Keys). Reinicie o Metro depois de mudar o `.env`.

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

## Site, termos e privacidade

[`docs/index.html`](docs/index.html) é a página pública do app: apresentação, **Termos de Uso** (`#termos`), **Política de Privacidade** (`#privacidade`), **Suporte** (`#suporte`) e **exclusão de conta** (`#excluir-conta`). Antes de publicar, troque os campos destacados em amarelo (`[SEU NOME OU EMPRESA]`, `[E-MAIL DE SUPORTE]`) e os links das lojas.

Para publicar de graça: GitHub → Settings → Pages → *Deploy from a branch* → `main` / pasta `/docs`. Depois use as URLs no `.env` (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`) e nas lojas:

| Campo na loja | URL |
|---|---|
| App Store: Privacy Policy URL · Google Play: Política de privacidade | `…/#privacidade` |
| App Store: Support URL | `…/#suporte` |
| App Store: EULA personalizado (opcional) | `…/#termos` |
| Google Play: URL para excluir a conta | `…/#excluir-conta` |

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
    auth.tsx           criar conta / entrar
    index.tsx          tela inicial: lista de duelos
    new-duel.tsx       criar duelo (metas e aposta)
    join.tsx           entrar num duelo com código
    settings.tsx       conta: perfil, lembretes, sair
    duel/              abas do duelo aberto: Hoje · Ranking · Provas · Duelo
    checkin/[habitId]  postar prova com foto
    proof/[id]         ver prova, reagir, contestar, apagar
    goals.tsx          editar metas e aposta
  domain/              regras puras e testadas (hábitos, datas, pontuação, níveis)
  store/useGame.ts     estado (zustand + AsyncStorage), otimista com fila de sync
  sync/supabase.ts     conta, duelos, provas e realtime
  widgets/             widget SwiftUI (iOS) e Jetpack Compose (Android)
  components/          UI, placar VS, cards, confete, comemoração
supabase/schema.sql    banco, RLS, funções e storage
```

## Observações

- O placar é sempre **recalculado a partir dos check-ins**, então os dois aparelhos chegam ao mesmo resultado. Por isso, mudar as metas recalcula também os dias anteriores.
- As fotos ficam num bucket privado e são exibidas com URLs assinadas (7 dias). Suas próprias fotos também ficam salvas no aparelho.
- Check-ins feitos sem internet ficam na fila e sobem no próximo sync. Para forçar, puxe a tela para baixo.
- **Excluir conta** (Minha conta → Excluir minha conta) chama a Edge Function [`delete-account`](supabase/functions/delete-account/index.ts), que apaga as fotos, os duelos em que a pessoa joga sozinha e o usuário. Exigência da App Store (5.1.1(v)).
- **Denúncias** (tela da prova → Denunciar) vão para a tabela `reports`, que só a equipe vê pelo painel do Supabase. A Apple espera que denúncias sejam analisadas em até 24 h: confira a tabela e marque `status = 'resolvida'`.
- **Bloquear** (aba Perfil do duelo → Bloquear, ou depois de denunciar uma prova) chama a RPC `block_player`: guarda o bloqueio na tabela `blocks`, apaga as provas de quem bloqueou naquele duelo e tira a pessoa dele. `join_duel` recusa juntar duas pessoas que se bloquearam. A lista e o desbloqueio ficam em Minha conta.
- **Relógio** (Minha conta → ⌚ Relógio): lê o Apple Health (iOS, [`health.ios.ts`](src/lib/health.ios.ts)) ou o Health Connect (Android, [`health.android.ts`](src/lib/health.android.ts)). Ao abrir o app, confere hoje e ontem; meta batida vira prova automática sem foto (coluna `health`), uma por duelo/meta/dia (id determinístico), e o rival pode contestar. Metas e alvos em [`healthGoals.ts`](src/domain/healthGoals.ts): 10 mil passos, 30 min de treino, 7h de sono, 10 min de meditação e 20 min ao ar livre (só Apple Watch). Dados digitados à mão no app de saúde não contam. Precisa de build nativo novo (não roda no Expo Go). Na Play Store, os dados de saúde exigem a declaração de Health Connect no Play Console.
- **Story do Instagram:** na comemoração da semana e do mês, "Postar no Story" gera uma arte 1080x1920 ([`StoryCard.tsx`](src/components/StoryCard.tsx)) com `react-native-view-shot` e abre o editor de Stories do Instagram via `react-native-share`. Exige `EXPO_PUBLIC_FACEBOOK_APP_ID` (regra da Meta); sem ele, ou sem Instagram instalado, abre o menu de compartilhar do celular.
- **Privacidade e suporte:** a política está em [`src/lib/privacyPolicy.ts`](src/lib/privacyPolicy.ts) (tela `/privacy`) e em [`docs/privacy-policy.md`](docs/privacy-policy.md) para publicar numa URL pública. Com `EXPO_PUBLIC_PRIVACY_POLICY_URL` definida, os links abrem a página publicada; sem ela, abrem a tela do app. `EXPO_PUBLIC_SUPPORT_EMAIL` mostra o contato em Minha conta e na política.

## Premium (Level Fit Pro)

Grátis: **1 duelo por vez** (criado ou entrado com código). Pro: duelos ilimitados. A regra vale no banco (`create_duel`/`join_duel`), não só na tela.

Como a cobrança é dentro do app, Apple e Google exigem as compras da própria loja. O app usa o [RevenueCat](https://www.revenuecat.com) (`react-native-purchases` + `react-native-purchases-ui`): a compra acontece no **Paywall** do RevenueCat e "Gerenciar assinatura" abre o **Customer Center**. O servidor confere a assinatura com a função [`premium-sync`](supabase/functions/premium-sync/index.ts). Código em [`src/lib/premium.ts`](src/lib/premium.ts).

Planos (todos dão o entitlement **`levelfit_pro`**):

| Produto | Tipo | Pacote na offering |
|---|---|---|
| `monthly` | assinatura mensal | `$rc_monthly` |
| `yearly` | assinatura anual | `$rc_annual` |
| `lifetime` | compra única (não consumível) | `$rc_lifetime` |

Para ativar:

1. **Testar sem loja (Test Store):** no RevenueCat, crie os 3 produtos na Test Store, o entitlement `levelfit_pro` (com os 3 produtos) e a offering `default` (marcada como *current*) com os 3 pacotes; crie um Paywall para essa offering. Coloque a chave `test_...` em `EXPO_PUBLIC_REVENUECAT_TEST_KEY` no `.env`. Ela só é usada em desenvolvimento (`__DEV__`).
2. **Lojas (produção):** crie `monthly` e `yearly` num grupo de assinaturas no App Store Connect e no Google Play Console, e `lifetime` como compra não consumível / produto único. Importe no RevenueCat e anexe ao mesmo entitlement e offering.
3. **App:** chaves públicas das lojas em `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_...`) e `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_...`), no `.env` e no `eas env`, e gere um novo build.
4. **Supabase → Edge Functions → Secrets:** `REVENUECAT_SECRET_API_KEY` (chave secreta do RevenueCat) e `REVENUECAT_WEBHOOK_AUTH` (um valor aleatório longo).
5. **RevenueCat → Integrations → Webhooks:** URL `https://<projeto>.supabase.co/functions/v1/premium-sync` e o header Authorization com o mesmo valor de `REVENUECAT_WEBHOOK_AUTH`.
