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

## CI

Medido num runner limpo do GitHub Actions (`ubuntu-latest`), não copiado de outro repositório:

| etapa                             |          tempo |
| --------------------------------- | -------------: |
| lint + typecheck (gate)           |           14 s |
| pull das imagens + `up`           |           45 s |
| readiness (API 0,6 s · UI 16,2 s) |           16 s |
| seed + `cache:clear`              |            4 s |
| smoke (2 specs)                   |            4 s |
| **job E2E completo**              | **1 min 53 s** |

O gate estático roda primeiro de propósito: um erro de lint falha em 14 s sem gastar os ~2 min
de Docker. Cachear as imagens ficou **fora de escopo por medição** — o pull custa 45 s no
runner (contra ~11 min numa conexão doméstica), então não paga a complexidade.

## Decisões

- [ADR-0001](docs/adr/0001-app-alvo-toolshop-self-hosted.md) — por que Toolshop self-hosted
- [ADR-0002](docs/adr/0002-compose-proprio-amd64.md) — por que um compose próprio, amd64-nativo

---

Semana 1 concluída — este README vira documento de decisão conforme as camadas entram.
