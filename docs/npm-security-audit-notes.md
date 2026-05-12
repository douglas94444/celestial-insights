# Notas: `npm audit` e dependências TanStack

## Estado após alinhamento (2026)

- **`@tanstack/react-router`**, **`@tanstack/react-start`** e **`@tanstack/router-plugin`** estão na mesma linha de releases recentes (`package.json`), o que **deduplica** `@tanstack/history` no lockfile (hoje **só `1.161.6`**).
- **`h3` 1.x** deixou de ser dependência direta do stack Start atual: `@tanstack/start-server-core` usa **`h3-v2`** (`npm:h3@2.0.1-rc.20`), o que remove os avisos **high** anteriores (path traversal / SSE em `h3` ≤ 1.15.8).
- **`js-yaml`** via `xmlbuilder2` antigo deixa de aparecer com o plugin/router atual (cadeia atualizada).

## GHSA-rmmr-r34h-pfm5 (`@tanstack/history`, “Malware”)

O relatório do `npm audit` pode continuar a mostrar **critical** para `@tanstack/history` com **todas** as versões.

- No JSON do audit, o campo `range` costuma ser **`>=0`**, ou seja, o advisory está aplicado ao **nome do pacote inteiro** até o ecossistema GitHub/npm refinar intervalos (comportamento típico após incidentes de supply chain).
- Isto **não** significa necessariamente que a tarball **1.161.6** instalada a partir de `registry.npmjs.org` sob o scope **`@tanstack/`** (mantenedor oficial TanStack) seja a mesma que versões maliciosas eventualmente publicadas noutro contexto.
- **Triagem manual:** confirmar no [advisory](https://github.com/advisories/GHSA-rmmr-r34h-pfm5) se já listam versões **seguras** explícitas; até lá, `npm audit fix --force` que sugere **downgrade** de `@lovable.dev/vite-tanstack-config` costuma ser **pior** que manter o stack alinhado e testado.

## Overrides (`package.json`)

Não foram adicionados `overrides` de `h3`/`js-yaml`: o **bump coordenado** das dependências TanStack resolveu os CVEs reais. Só voltar a considerar `overrides` se algum pacote transitivo regressar e o upstream ainda não tiver fix.

## Manutenção

- Voltar a correr `npm audit` após upgrades de `@tanstack/*` e `@lovable.dev/vite-tanstack-config`.
- Preferir **subir TanStack em bloco** (router + start + router-plugin) conforme changelog oficial a evitar duas linhas de versão no mesmo `node_modules`.
