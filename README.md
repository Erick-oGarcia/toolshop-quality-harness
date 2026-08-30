# toolshop-quality-harness

[![CI](https://github.com/Erick-oGarcia/toolshop-quality-harness/actions/workflows/pr.yml/badge.svg)](https://github.com/Erick-oGarcia/toolshop-quality-harness/actions/workflows/pr.yml)

A full-stack quality harness for a real e-commerce demo app ([Toolshop](https://github.com/testsmith-io/practice-software-testing)), self-hosted with Docker Compose. UI, API and **database checks** live in the same Playwright/TypeScript suite.

## Why this exists

Most test suites only talk to the application. When the application is wrong, they agree with it.

In week 1 the API returned HTTP 200 with products that no longer existed in the database. A UI test would not catch it, and neither would an API test: both read the answer from the same application that was wrong. The suite had no source of truth independent from the application. This repository adds that source: the tests also read the database.

That check now exists: [`catalog-consistency.spec.ts`](tests/db/catalog-consistency.spec.ts)
joins the storefront to the `products` table on the ULID each card carries, and
it has been [shown failing](docs/detection-proof.md) against that exact defect —
because a check that has never been seen red is not evidence of anything.

## A second database

`tests/oracle` checks the Oracle
[CO sample schema](https://github.com/oracle-samples/db-sample-schemas) (MIT) for
the rules a schema cannot hold by itself — a shipment belonging to the customer
who ordered it, a cancelled order with nothing shipped against it. It runs in its
own project and its own CI job.

```bash
npm run oracle:up      # first start takes minutes; the image is ~2 GB
npm run oracle:seed    # co_create + co_populate, measured at 9 s + 71 s
npm run test:oracle
npm run oracle:down
```

The driver runs in **thin mode**: `oracledb.initOracleClient()` is never called,
so no Oracle Instant Client is needed anywhere — which is the usual reason Oracle
checks end up running on one machine and nowhere else.

> Run one stack at a time locally. Oracle and the Toolshop stack together
> exhausted this developer machine badly enough to take the Docker daemon down
> with them. On CI they are separate jobs on separate runners, which is the other
> half of why the job is split.

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

## Flaky tests

`retries: 2` is on in CI to absorb infrastructure noise, which means a green
badge can hide a spec that failed twice. So the log is read, not the badge —
Playwright prints `·····×±`, and that `±` is a retry that succeeded.

1. **A spec that only passes on retry is a defect to investigate, not a pass.**
2. **No fixed waits.** Every step waits on a signal the application emits: the
   cart badge (written inside the `POST /carts` handler), the address button
   enabling itself (bound to form validity), the payment success message.
3. **Timeouts are argued in a comment, never raised silently.**

First entry: the checkout spec failed on the first attempt in CI and passed on
retry. Two explanations were written down and both were wrong — a country code
mismatch, then a slow container. Raising the timeout to 20 s changed nothing,
which is what disproved the second one.

The application logs settled it: `POST /invoices` came back **422**. The address
step looks the address up from country + postcode and patches street, city and
state with the result; the invoice API validates the submitted city against that
same lookup, which is seeded by country + postcode so both sides compute the
same answer. The spec was typing its own city on top, so whichever landed last
decided whether the order was accepted — and the losing case is a silent 422,
because the UI swallows the error and still says _"Payment was successful"_.

The fix was not a wait. The spec stopped inventing address data and lets the
application fill it, which makes the two sides agree by construction. The 20 s
timeout was removed once its justification turned out to be false: a workaround
whose stated reason has been disproved is worse than no workaround.
default is a client-side number unrelated to the work being awaited — a
`POST /invoices` round trip against a cold container. The longer wait hides
nothing: a rejected invoice never renders the confirmation, so a real failure
still fails, without the "slow or broken?" ambiguity.

Second entry: `stock-decrement` buys the **second** product on the page while
every other spec buys the first. A check that asserts a difference on a shared
row has to own that row — otherwise another spec's order lands inside the window
between the reading and the assertion, and no retry or wait can repair the
arithmetic.

Third entry, and it is about the system rather than the suite: the stack runs a
single `queue:work` process. Serially the stock decrement lands in about two
seconds; with the suite fully parallel several orders queue behind that one
worker and the wait exceeds the window — the decrement still happens, later. CI
runs one worker, so the check holds there. Parallelising would mean scaling the
worker, not widening the timeout: the number that would work is a property of
the load, not of the check.

## Findings

Defects in the application under test, found while building the suite:

- [Confirm has to be pressed twice](docs/findings/confirm-needs-two-clicks.md) —
  the first press reports success and creates no order
- [The country field arrives blank](docs/findings/country-code-mismatch.md) —
- [Almost every stored invoice has no subtotal](docs/findings/invoices-without-subtotal.md) —
  200 of 205 rows, from the seeder rather than the checkout
  options keyed by ISO code, profile stores the name

## Decisions

- [ADR-0001](docs/adr/0001-app-alvo-toolshop-self-hosted.md) — why a self-hosted Toolshop
- [ADR-0002](docs/adr/0002-compose-proprio-amd64.md) — why a custom, amd64-native compose file

> ADRs are written in Portuguese first and translated as they are reviewed.

---

Weeks 1–2: foundation, page objects behind typed fixtures, and the login flow. This README grows into a decision document as each layer lands.
