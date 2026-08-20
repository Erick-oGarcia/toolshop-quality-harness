# toolshop-quality-harness

[![CI](https://github.com/Erick-oGarcia/toolshop-quality-harness/actions/workflows/pr.yml/badge.svg)](https://github.com/Erick-oGarcia/toolshop-quality-harness/actions/workflows/pr.yml)

Full-stack quality harness for a real e-commerce demo app ([Toolshop](https://github.com/testsmith-io/practice-software-testing)), self-hosted via Docker Compose: UI, API and **database-level validation** in a single Playwright/TypeScript suite.

## Running locally

```bash
npm ci
npm run app:up      # sobe a stack (Angular + Laravel + MariaDB + worker)
npm run app:wait    # espera ficar pronta, imprime o tempo de cada serviço
npm run app:seed    # migrate:fresh --seed + cache:clear (ver nota abaixo)
npm run test:smoke
```

> **Por que o seed limpa o cache:** o `ProductService` da app cacheia listagens por 300 s em
> arquivo, e esse cache **sobrevive** ao `migrate:fresh`. Sem o `cache:clear`, a API responde
> HTTP 200 para produtos cujo `COUNT(*)` no banco já é 0 — e um teste quebrado passa.
> Detalhes e a demonstração em `docs/db-validation.md`.

## Decisões

- [ADR-0001](docs/adr/0001-app-alvo-toolshop-self-hosted.md) — por que Toolshop self-hosted
- [ADR-0002](docs/adr/0002-compose-proprio-amd64.md) — por que um compose próprio, amd64-nativo

---
Semana 1 em andamento — este README vira documento de decisão conforme as camadas entram.
