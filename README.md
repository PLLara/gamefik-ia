# gamefik-ia — Laboratório de criação de atividades com IA

> Parte do workspace Gamefik — leia [`../AGENTS.md`](../AGENTS.md) antes de qualquer tarefa. Contexto no mapa de frontends: [`../readme/reference/FRONTEND_APPS.md`](../readme/reference/FRONTEND_APPS.md) §4.

⚠️ **Armadilha de nome:** o `package.json` deste projeto tem `"name": "gamefik-manager"` — mas este **não** é o Manager. O Manager de produção é `manager/admin-interface` (Legacy) / `admin/gamefik-admin` (hub interno).

## O que é

Protótipo/laboratório de UX para **criação de atividades com IA**: uma única página de chat/editor (`app/page.tsx`) que conversa com o Gemini para gerar atividades. É onde experimentos de IA são validados antes de portar — a funcionalidade equivalente **de produção** vive no `manager/admin-interface` (`pages/chat-ia` + editor de trilhas). **Não trate como produto principal.**

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/Radix. Gráficos com recharts. Deploy Vercel (+ `@vercel/analytics`).
- IA: `@google/genai` (Gemini) — orquestração em `lib/activity-orchestrator.ts`, schema da atividade em `lib/activity-schema.ts` (zod), i18n em `lib/i18n.ts`.
- Única rota de API: `app/api/generate-activity/route.ts` (runtime nodejs) — aceita anexos PDF/imagem (máx. 4 anexos, 14 MB total, 8 MB por arquivo) e histórico recente de mensagens.

## Comandos

```bash
npm run dev        # next dev
npm run build      # next build
npm run lint       # oxlint
npm run typecheck  # tsc --noEmit
```

## Variáveis de ambiente (nomes)

- `GEMINI_MODEL` (default `gemini-3.1-pro-preview`), `GEMINI_API_VERSION` (default `v1beta`)
- Chave da API: lida dinamicamente em `lib/gemini.ts` (aceita mais de um nome de env — ver a lista no arquivo). Server-side only; nunca exponha como `NEXT_PUBLIC_*`.

## Observações para agentes

1. Mudança de produto em criação de atividades por IA vai no **admin-interface** (`chat-ia`, ver `docs/CHAT_IA_TRILHAS_UNIFICACAO.md` lá) — aqui é bancada de testes.
2. Repo git próprio; deploy Vercel manual/por push — sem CI de testes.
