# toolshop-quality-harness

[![CI](https://github.com/Erick-oGarcia/toolshop-quality-harness/actions/workflows/pr.yml/badge.svg)](https://github.com/Erick-oGarcia/toolshop-quality-harness/actions/workflows/pr.yml)

A full-stack quality harness for a real e-commerce demo app ([Toolshop](https://github.com/testsmith-io/practice-software-testing)), self-hosted with Docker Compose. UI, API and **database checks** live in the same Playwright/TypeScript suite.

## Why this exists

Most test suites only talk to the application. When the application is wrong, they agree with it.

In week 1 the API returned HTTP 200 with products that no longer existed in the database. A UI test would not catch it, and neither would an API test: both read the answer from the same application that was wrong. The suite had no source of truth independent from the application. This repository adds that source: the tests also read the database.

## Running locally

```bash
npm ci
npm run app:up      # start the stack (Angular + Laravel + MariaDB + queue worker)
npm run app:wait    # wait until it is ready, print how long each service took
npm run app:seed    # migrate:fresh --seed + cache:clear (see the note below)
npm run test:smoke
```

> **Why the seed clears the cache:** `ProductService` caches product listings for 300 s on the
> file driver, and that cache **survives** `migrate:fresh`. Without `cache:clear`, the API answers
> HTTP 200 for products whose `COUNT(*)` in the database is already 0 — and a broken test passes.

## CI

Measured on a clean GitHub Actions runner (`ubuntu-latest`). These numbers come from the runner, not from another repository:

| step                    |           time |
| ----------------------- | -------------: |
| lint + typecheck (gate) |           16 s |
| install browser         |           33 s |
| pull images + `up`      |           46 s |
| readiness               |           15 s |
| seed + `cache:clear`    |            4 s |
| suite (4 specs)         |            8 s |
| **full E2E job**        | **1 min 56 s** |

The static gate runs first on purpose: a lint error fails in 16 s and never pays the ~2 minutes of Docker. Caching the images is **out of scope by measurement** — the pull costs 46 s on the runner (against ~11 minutes on a home connection), so it does not pay for the extra complexity.

## Decisions

- [ADR-0001](docs/adr/0001-app-alvo-toolshop-self-hosted.md) — why a self-hosted Toolshop
- [ADR-0002](docs/adr/0002-compose-proprio-amd64.md) — why a custom, amd64-native compose file

> ADRs are written in Portuguese first and translated as they are reviewed.

---

Weeks 1–2: foundation, page objects behind typed fixtures, and the login flow. This README grows into a decision document as each layer lands.
