# AgentOmniE2E — house rules

This repo is an end-to-end test framework that AI agents help write and maintain. It supports two
test engines, **WebdriverIO** and **Playwright**. Every agent working here MUST follow these rules.

## Test engine: one per project

> **Choose either WebdriverIO or Playwright based on your need, not both.** The engine is set once
> with `TEST_ENGINE` in `.env` (`wdio`, the default, or `playwright`) and as a GitHub variable.

- Read `TEST_ENGINE` before writing, planning or fixing any test. Missing → `wdio`. Any other value → STOP and ask.
- Write and fix tests **only** for that engine, in its folder. Never generate the same test for both
  engines, and never "fix" a test by moving it to the other engine.
- Engine-specific: `test/wdio/` (`wdio-conventions` skill, `wdio-mcp`) or `test/playwright/`
  (`playwright-conventions` skill, `playwright-mcp`).
- Shared by both: `test/fixtures/`, `test/helpers/`, `test-cases/`, `plans/`, `reports/`, the
  publish script and every rule below.

## How work flows

`/qa-explore` runs steps 1–3. `/qa-automate` runs steps 4–7.

1. **explorer**: discovers every page of the app and writes `test-cases/catalog.md`.
2. **test-data**: reads the catalog and writes fixtures + data helpers.
3. **Checkpoint**: STOP. The human sets each case's Status to `approved` or `rejected`.
4. **planner**: approved cases → `plans/<feature>.md`.
5. **generator**: plan → page objects + a spec for the selected engine
   (`test/wdio/specs/<feature>.e2e.ts` or `test/playwright/specs/<feature>.spec.ts`), then runs it.
6. **healer**: fixes failing specs (max 3 attempts) or marks a suspected app bug.
7. **publish**: `npm run qa:publish -- …` pushes a `qa/…` branch to `GITHUB_REPO` and opens a pull
   request. The human reviews and merges it; GitHub Actions then runs the tests on its own.

Sub-agent definitions live in `.claude/agents/`, the two commands in `.claude/skills/`. Detailed coding
conventions are in the engine's skill: `wdio-conventions` or `playwright-conventions` (`.claude/skills/`).

## Non-negotiable rules

1. **Selectors live only in page objects** (`test/wdio/pageobjects/` or `test/playwright/pages/`).
   Prefer `data-testid`, then accessible role/name, then stable CSS. Never absolute XPath, never
   generated class names.
2. **One user journey per spec.** Every test has at least one meaningful `expect(...)` assertion.
3. **No fixed sleeps** (`browser.pause()`, `page.waitForTimeout()`). Use the engine's waits:
   WDIO `waitForDisplayed` / `waitUntil`; Playwright auto-waiting locators and web-first `expect`.
4. **Test data** comes from `test/fixtures/` or `test/helpers/data/`, never from another test.
   Unique values use the run-ID helper so parallel runs never collide.
5. **Tag and trace:** describe titles include `@smoke` or `@regression` and the case ID, e.g.
   `describe('Login @smoke TC-LOGIN-001', ...)`.
6. **Never weaken an assertion to make a test pass.** If the app does not behave as the case
   expects, skip the test with a `BUG?` note (WDIO `it.skip`, Playwright `test.skip`) and report it.
7. **Healer may change selectors, waits and navigation — never expected values.**

## Safety

- Only run against the test/staging URL in `BASE_URL`. Never production.
- Credentials, only for apps with a login, come from environment variables (`TEST_USER`, `TEST_PASSWORD`). Never print them,
  never write them to fixtures, plans, logs or commits.
- Agents and tests may create records only when they need them, always named with the prefix
  `QA-AUTO-`, and must delete them again. Never edit, approve, sign off, delete, re-run or send
  anything they did not create. List such actions as test cases instead.
- `GITHUB_TOKEN` comes from `.env`. Never print it, never put it in a git remote URL, git config,
  file or commit. Only `scripts/publish.mjs` uses it.
- Work on a `qa/…` branch and open a pull request; never push to `main`. The one exception is
  `npm run qa:publish -- --bootstrap`, the very first push to an empty repository, and only when the
  human has confirmed it.

## Commands

```bash
npm run test               # all specs with the engine in TEST_ENGINE (local, headed)
npm run test:smoke         # @smoke only
npm run test:ci            # CI settings: headless, retries, reporters
npm run report             # open the engine's report (Allure for WDIO, HTML for Playwright)
npx wdio run wdio.conf.ts --spec test/wdio/specs/<file>.e2e.ts        # one spec, WDIO
npx playwright test test/playwright/specs/<file>.spec.ts              # one spec, Playwright
npm run qa:publish -- --branch qa/<name> --title "<PR title>" [--body-file <file>]   # push + open PR
```
