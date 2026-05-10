# Testes E2E (Playwright)

## Smoke público (CI)

Com `SKIP_AUTH_E2E=1` (predefinição no CI), apenas fluxos sem sessão correm: landing, `/auth`, redirect de `/dashboard` para login.

## Momento e rotas autenticadas

Para correr testes que dependem de sessão (ex.: `/momento`, `/dashboard` com saudação):

1. Arranca a app: `npm run dev:e2e`
2. Abre o navegador, faz login com um utilizador que **já tenha pelo menos um mapa** criado
3. Grava o estado de armazenamento (Playwright codegen ou “Save storage”)
4. Define a variável de ambiente `PLAYWRIGHT_STORAGE_STATE` com o caminho para o ficheiro JSON de estado
5. Remove `SKIP_AUTH_E2E` ou define `SKIP_AUTH_E2E=0`

```bash
set PLAYWRIGHT_STORAGE_STATE=C:\caminho\auth.json
set SKIP_AUTH_E2E=
npm run test:e2e
```

Sem mapa principal, `/momento` redireciona para onboarding e os testes autenticados podem falhar.
