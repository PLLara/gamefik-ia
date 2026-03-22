# Gamefik Manager

Educational gamification dashboard for teachers (Brazilian Portuguese UI). Pure Next.js 16 frontend with mock data — no backend, database, or authentication.

## Cursor Cloud specific instructions

### Project overview

Single Next.js 16 app (React 19, TypeScript 5.7, Tailwind CSS 4, shadcn/ui). All data is mock-generated client-side in `lib/data.ts`. AI chat responses are hardcoded stubs (no real LLM calls). No `.env` file is needed.

### Running the dev server

```bash
pnpm dev        # http://localhost:3000
```

### Key routes

| Route | Description |
|---|---|
| `/` | AI Chat — create activities via natural language |
| `/chat` | AI Chat with sidebar history + editor panel |
| `/turmas/[id]` | Class detail — student grid |
| `/recompensas` | Rewards store |
| `/relatorios` | Reports / analytics dashboard |
| `/atividades/lista` | Activities list |
| `/atividades/criar` | AI-assisted activity creation |
| `/atividades/criar-manual` | Manual quiz/mission editor |

### Build & lint

```bash
pnpm build      # production build (TypeScript errors are deliberately ignored via next.config.mjs)
pnpm lint        # runs eslint — NOTE: eslint is not in devDependencies; will fail unless installed separately
```

### Known caveats

- **No test framework**: There are no test files or test scripts in this project.
- **ESLint not installed**: The `lint` script references `eslint` but it is not listed in `devDependencies`. Running `pnpm lint` will fail with `eslint: not found`.
- **TypeScript errors ignored**: `ignoreBuildErrors: true` is set in `next.config.mjs`.
- **External CDNs**: Avatars load from `api.dicebear.com`, fonts from Google Fonts, and icon from `manager.gamefik.com`. Internet access is needed for full visual fidelity.
- **Dual lockfiles**: Both `pnpm-lock.yaml` and `yarn.lock` exist; prefer pnpm.
