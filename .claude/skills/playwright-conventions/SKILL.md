---
name: playwright-conventions
description: Coding conventions and gold-standard examples for Playwright page objects and specs in this repo. Load before writing or changing any file under test/playwright/ (used when TEST_ENGINE=playwright).
---

# Playwright conventions (TEST_ENGINE=playwright)

## Page objects (`test/playwright/pages/*.page.ts`)
- One class per page/screen, extends `BasePage` from `base.page.ts`, default-exported.
- Created per test with the test's `page`: `const home = new HomePage(page)`. No singletons, no globals.
- Locators are getters returning `this.page.locator(...)` / `getByRole(...)` etc.
- Actions are async methods named for user intent: `login(user, pass)`, `addToCart(name)`.
- No assertions in page objects (except "page is loaded" checks in `waitForLoaded()`).

Gold standard: `test/playwright/pages/home.page.ts`.

## Specs (`test/playwright/specs/*.spec.ts`)
- File name = feature, kebab-case, ending `.spec.ts`.
- `import { test, expect } from '@playwright/test'`.
- One `test.describe` per case or tightly related group. Title format:
  `'<Feature> @smoke|@regression <CASE-ID>'` (the tags drive `--grep`).
- Arrange (fixtures/helpers) → Act (page object methods) → Assert (`expect`).
- Prefer web-first matchers: `toHaveText`, `toHaveURL`, `toBeVisible`, `toHaveCount`, `toHaveTitle`.
- Suspected app bugs: `test.skip(true, 'BUG? <expected> vs <actual>')` with a comment, never a weaker assertion.

Gold standard: `test/playwright/specs/home.spec.ts`.

## Selectors, in order of preference
1. `page.getByTestId('...')` (`data-testid`)
2. Role and accessible name: `page.getByRole('button', { name: 'Sign in' })`, `getByLabel`, `getByPlaceholder`
3. Stable id / name attribute: `page.locator('#email')`, `page.locator('[name="email"]')`
4. Stable CSS. Never absolute XPath or hashed class names (`.css-1x9z2`).

## Waits
- Locator actions and web-first `expect` auto-wait; don't add manual waits for them.
- For app state use `await expect.poll(() => ...)` or `page.waitForResponse(...)`.
- Never `page.waitForTimeout()`.

## Data
Shared with the WebdriverIO engine, unchanged:
- `loadFixture('<feature>', '<CASE-ID>')` from `test/helpers/data/factory.ts`.
- Unique values: `{{unique.email}}`, `{{unique.name}}`, `{{unique.id}}` placeholders.
- Preconditions via `setupX()` in `test.beforeAll` / `beforeEach`, matching `cleanupX()` in `afterAll` / `afterEach`.

## Running
- One spec: `npx playwright test test/playwright/specs/<file>.spec.ts`
- Debug a failure: `npx playwright show-trace reports/playwright-results/<test>/trace.zip`
