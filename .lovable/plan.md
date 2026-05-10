# AstroMap — Plano em Fases

SaaS de astrologia em PT-BR. Stack: TanStack Start + React + Tailwind + shadcn/ui + Lovable Cloud (Supabase) + React Query + Recharts. Cálculos com biblioteca JS real. Geocoding via lista estática BR. Stripe fica para fase posterior.

## Estratégia geral

Vamos construir em **5 fases**. Cada fase é entregável e utilizável. Esta proposta detalha **a Fase 1 a fundo** (que será implementada agora) e descreve as próximas em alto nível para você validar a direção.

```text
Fase 1 — Fundação + MVP (auth, onboarding, criar/ver mapa básico, dashboard)
Fase 2 — Mapa Premium (todos planetas, casas, aspectos, interpretações completas)
Fase 3 — Sinastria (compatibilidade entre 2 mapas)
Fase 4 — Trânsitos + Horóscopo + PDF + Notificações
Fase 5 — Stripe (assinatura Premium, paywall real, portal do cliente)
```

Até a Fase 5, o gating Premium existirá no schema (`subscription_tier`) e em flags de UI, mas todos os usuários terão acesso completo para testes. Conteúdo Premium já mostrará badges e estará pronto para o paywall.

---

## FASE 1 — Fundação + MVP (esta entrega)

### Objetivo

Usuário se cadastra, faz onboarding, gera seu primeiro mapa astral com cálculo real, vê interpretação básica (Sol/Lua/Ascendente) com visualização circular SVG, e gerencia mapas no dashboard.

### 1.1 Lovable Cloud + Schema

Habilitar Cloud e criar:

- **profiles** (id uuid PK ref auth.users, name text, avatar_url text, subscription_tier enum FREE/PREMIUM default FREE, stripe_customer_id text, created_at)
- **charts** (id, user_id FK auth.users, name, birth_date, birth_time, birth_place, latitude numeric, longitude numeric, timezone, planets_data jsonb, houses_data jsonb, aspects_data jsonb, is_primary bool, created_at)
- **user_roles** + enum `app_role` + função `has_role` (segurança, nunca roles na profiles)
- **synastries** (criada agora vazia para Fase 3)
- Trigger `handle_new_user` que cria profile no signup
- RLS em todas as tabelas: usuário só lê/escreve suas próprias linhas

### 1.2 Autenticação

- Página `/auth`: email/senha (signup + login) e Google OAuth
- `/reset-password` (público) para recuperação de senha
- `useAuth` hook usando `onAuthStateChange` + `getSession` (listener antes do get)
- Layout `_authenticated` com `beforeLoad` redirecionando para `/auth` se sem sessão
- `emailRedirectTo: window.location.origin` no signup

### 1.3 Estrutura de rotas (TanStack file-based)

```text
src/routes/
  __root.tsx              (shell + QueryClientProvider + Toaster)
  index.tsx               (landing pública)
  auth.tsx                (login/signup)
  reset-password.tsx
  _authenticated.tsx      (gate de auth + layout com sidebar)
  _authenticated/
    dashboard.tsx
    onboarding.tsx
    mapas.tsx             (lista)
    mapas.novo.tsx        (formulário)
    mapas.$id.tsx         (visualização)
    configuracoes.tsx
```

Rotas Premium (compatibilidade, trânsitos) entram em fases seguintes. Sidebar já mostra os itens com badge "PREMIUM" e levam a página de paywall placeholder.

### 1.4 Cálculos astrológicos (real)

Usar **astronomia** (puro JS, edge-compatible) em uma server function `calculateChart` (`src/lib/astrology.functions.ts`). Recebe `{ birth_date, birth_time, latitude, longitude, timezone }` e retorna o JSON estruturado (`planets`, `houses`, `aspects`).

- Sistema de casas: Placidus (default)
- Calcula Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão (Quiron + Nodos chegam na Fase 2)
- Aspectos: conjunção (orb 8°), oposição (8°), trígono (6°), quadratura (6°), sextil (4°)
- Resultado salvo em `charts.planets_data / houses_data / aspects_data`

> Se durante a implementação a `astronomia` se mostrar incompleta para casas/ascendente no Worker runtime, fallback para `astronomy-engine` (também puro JS). Validamos antes de comprometer.

### 1.5 Geocoding — lista estática BR

`src/lib/cities-br.ts`: ~300 maiores cidades brasileiras com `{ name, state, lat, lon, timezone }`. Combobox shadcn com busca fuzzy (Command). Usuário também pode digitar lat/lon manual num modo avançado.

### 1.6 Onboarding (3 passos)

`/_authenticated/onboarding` com state machine simples:

1. Boas-vindas + CTA
2. Form (nome, data, hora, "não sei a hora" → 12:00, cidade via combobox)
3. Loading com mensagens rotativas + chamada a `calculateChart` + insert em `charts` (is_primary=true) → redireciona a `/mapas/:id`

Se o usuário já tem mapa, `/onboarding` redireciona para dashboard.

### 1.7 Dashboard

- Card "Meu Mapa Principal" (Sol/Lua/Asc em destaque, miniatura SVG)
- Card "Horóscopo Hoje" — texto genérico por signo solar (12 textos estáticos em PT-BR num JSON)
- Card "Próximos Trânsitos" — placeholder com badge Premium
- Lista "Meus Mapas" com ações (ver/editar/excluir)
- Botão "+ Novo Mapa" (FREE: bloqueia se já tem 1, mostra modal de upgrade)

### 1.8 Visualização do Mapa (`/mapas/:id`)

Componente `<NatalChartWheel />` em SVG responsivo:

- Anel externo: 12 signos com símbolos Unicode + cores
- Anel interno: 12 casas numeradas com cúspides nos graus corretos
- Glifos planetários posicionados por longitude
- Linhas de aspectos no centro (cores por tipo)
- Tooltip com nome/grau/signo no hover
- Click no planeta → scroll para interpretação

Tabs:

- **Essência** (FREE, ativa): Sol, Lua, Ascendente com texto interpretativo
- **Planetas / Casas / Aspectos** — visíveis com badge PREMIUM, conteúdo travado por overlay (paywall placeholder até Fase 5; em Fase 2 conteúdo completo é renderizado)

Banco de interpretações: `src/data/interpretations/` com JSONs:

- `sun-in-signs.json`, `moon-in-signs.json`, `asc-in-signs.json` (36 textos para Fase 1)
- Estrutura preparada para receber os 120+120+aspectos na Fase 2

### 1.9 Configurações (esqueleto)

- Tab Perfil: editar nome + upload avatar (Supabase Storage bucket `avatars`)
- Tab Assinatura: mostra plano atual + CTA "Assinar Premium" desabilitado ("em breve")
- Tab Preferências: sistema de casas, zodíaco (salvo em profile, usado nos cálculos)
- Tab Privacidade: excluir conta (server fn que apaga tudo)

### 1.10 Design system

- Paleta em `src/styles.css` (oklch): primary roxo místico, secondary azul celestial, accent dourado, fundo claro/escuro estrelado
- Tipografia: Poppins (headings) + Inter (body) via `<link>` no root
- Componentes shadcn já presentes; adicionar: command (para combobox), dropzone customizado p/ avatar
- Dark mode toggle (next-themes pattern já comum)
- Animações suaves com `framer-motion` no onboarding e revelação do mapa

### 1.11 Landing page

Hero ("Descubra seu mapa astral"), seção "O que é mapa astral", tabela Free×Premium, depoimentos mockados, FAQ (Accordion), footer. Cada link âncora interno; rotas de marketing extras ficam para depois.

### Detalhes técnicos

- **Server functions** em `src/lib/*.functions.ts` (charts.functions, astrology.functions, profile.functions) com `requireSupabaseAuth`
- **React Query** com `defaultPreloadStaleTime: 0` no router (já configurado)
- **Validação** Zod em todos os inputs (form de nascimento, profile)
- **Storage** bucket `avatars` (público read, write próprio)
- **i18n**: textos hard-coded em PT-BR (sem lib de i18n na Fase 1)
- **Responsivo**: sidebar shadcn collapsible em mobile

### Entregáveis Fase 1

✅ Auth completo + Cloud + RLS  
✅ Onboarding gera mapa real  
✅ Dashboard funcional  
✅ Visualização SVG do mapa  
✅ Interpretação Sol/Lua/Asc  
✅ Configurações básicas  
✅ Landing page

---

## FASE 2 — Mapa Premium (próxima)

- Adiciona Quiron + Nodos aos cálculos
- Bancos de interpretação completos (120 planeta-em-signo, 120 planeta-em-casa, ~50 aspectos)
- Tabs Planetas / Casas / Aspectos com conteúdo real
- Filtros de aspectos (harmônicos/desafiadores)

## FASE 3 — Sinastria

- Página `/compatibilidade`, server fn `calculateSynastry`
- Score 0-100, cards por área (amor, amizade, trabalho, convivência)
- Visualização de mapa duplo concêntrico
- Persistência em `synastries`

## FASE 4 — Trânsitos + extras

- Server fn `calculateTransits` (data range)
- Calendário interativo + lista filtrada
- Horóscopo personalizado (trânsitos do dia × natal)
- Download PDF (`@react-pdf/renderer`, edge-compatible)
- Notificações por email (Resend) com toggle e antecedência

## FASE 5 — Stripe (Lovable Payments)

- Habilitar Lovable Payments (recomendar provider via `recommend_payment_provider`)
- Produto Premium R$ 24,90/mês
- Checkout + webhook que atualiza `subscription_tier`
- Portal do cliente para gerenciar/cancelar
- Ativar paywalls reais nas features Premium
- Limite de 1 mapa para FREE passa a ser efetivo

---

## O que faço se você aprovar

Começo pela **Fase 1 inteira** numa rodada: habilito Cloud, crio schema + RLS, monto auth/onboarding/dashboard/visualização, integro `astronomia`, lista de cidades BR e interpretações Sol/Lua/Asc. Ao final, você terá um app utilizável de ponta a ponta para criar e visualizar seu primeiro mapa real. Depois seguimos fase a fase conforme você for validando.
