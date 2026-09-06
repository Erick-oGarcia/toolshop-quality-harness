# Commands

Every command this repository answers to, in the order you actually reach for
them. The notes are the point: most of these have a reason to exist that is not
obvious from the name.

## 1. The environment

Nothing runs without the application under test.

```bash
npm run app:up      # Angular + Laravel + MariaDB + queue worker
npm run app:wait    # blocks until ready, printing how long each service took
npm run app:seed    # migrate:fresh --seed, then chown, then cache:clear
npm run app:down    # stop and remove volumes
```

`app:seed` is the one you repeat most. The suite places orders and decrements
stock, so the database drifts as you work.

The `cache:clear` inside it is not tidiness. `ProductService` caches listings for
300 s on the file driver and that cache **survives** `migrate:fresh`, so without
the clear the API serves products whose `COUNT(*)` is already 0 — and a broken
test passes. That defect is the reason the database layer exists.

## 2. Running tests

```bash
npm test                                     # the 15 application specs
npm run test:smoke                           # 2 specs, the fast local loop
npx playwright test tests/db                 # one directory
npx playwright test tests/e2e/login.spec.ts  # one file
npx playwright test -g "wrong password"      # by name fragment
npx playwright test --project=chromium       # only the anonymous project
```

`npm test` names its projects — `--project=chromium --project=chromium-auth` —
rather than running everything. A bare `playwright test` collects 21 tests
including the Oracle and Pact projects, which need infrastructure most machines
do not have. The default command has to work for someone who just cloned the
repository.

`test:smoke` exists for the feedback loop: 16 s against roughly 60 s. It is
deliberately **not** what CI runs — it once was, and the gate went green without
executing the specs that had no `@smoke` tag. A fast subset is right for
iterating and wrong for deciding whether a merge can happen.

## 3. Seeing what happens

```bash
npx playwright test --ui                     # time travel, DOM per step, watch mode
npx playwright test <file> --debug           # Inspector, one action at a time
npx playwright test <file> --headed          # visible browser, normal speed
npx playwright show-report                   # the HTML report of the last run
npx playwright show-trace test-results/<run>/trace.zip
```

UI mode is the one worth learning. Traces are retained on failure, not on first
retry: a trace of the attempt that passed explains nothing.

## 4. The layers that need more than the app

```bash
npm run oracle:up && npm run oracle:seed     # ~8 min the first time, ~2 GB image
npm run test:oracle                          # 4 specs, ~4 s
npm run oracle:down

npm run test:perf                            # k6 gate: calibrate, then load

npx playwright test --project=pact-consumer --project=pact-provider
```

> **Run one stack at a time.** Oracle and the Toolshop stack together have
> exhausted this developer machine badly enough to take the Docker daemon down
> with them. On CI they are separate jobs on separate runners.

The consumer project needs no application at all — it runs against Pact's own
mock server. The provider project depends on it, so what gets verified is always
the contract this branch produces.

## 5. The static gate

```bash
npm run lint && npm run typecheck && npm run format
```

Run all three before pushing. CI runs exactly these, and pushing after only
`format` is how `__ENV is not defined` reached the runner instead of being caught
here in three seconds.

## 6. Flags worth remembering

```bash
--retries=0        # see the real failure, with nothing masking it
--workers=1        # serial, like CI — reproduces parallelism problems
--last-failed      # only what failed last time
--repeat-each=5    # run five times — the tool for hunting a flake
```

`--repeat-each` is how you turn a suspicion into evidence. Five passes in a row
is not proof, but one failure in five is a reproduction, and a reproduction is
what lets you fix a flake instead of retrying it.

## The day-to-day line

With the stack already up:

```bash
npm run app:seed && npx playwright test tests/db --retries=0
```
