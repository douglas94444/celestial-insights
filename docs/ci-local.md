# CI local

Ordem recomendada antes de abrir um PR:

```bash
npm run format:check
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

No CI do GitHub a mesma sequência inclui `format:check`, `lint`, `test`, `build` e smoke público Playwright (`SKIP_AUTH_E2E=1`).
