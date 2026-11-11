---
name: wdio-conventions
description: Coding conventions and gold-standard examples for WebdriverIO page objects and specs in this repo. Load before writing or changing any file under test/wdio/ (used when TEST_ENGINE=wdio, the default).
---

# WDIO conventions (TEST_ENGINE=wdio)

## Page objects (`test/wdio/pageobjects/*.page.ts`)
- One class per page/screen, extends `Page` from `page.ts`, exported as a singleton.
- Selectors are getters returning `$()` / `$$()`.
- Actions are async methods named for user intent: `login(user, pass)`, `addToCart(name)`.
- No assertions in page objects (except "page is loaded" checks in `waitForLoaded()`).

Gold standard: `test/wdio/pageobjects/home.page.ts`.

## Specs (`test/wdio/specs/*.e2e.ts`)
- File name = feature, kebab-case, ending `.e2e.ts`. One `describe` per case or tightly related group.
- Title format: `'<Feature> @smoke|@regression <CASE-ID>'`.
- Arrange (fixtures/helpers) → Act (page object methods) → Assert (`expect`).
- Prefer specific matchers: `toHaveText`, `toHaveUrl`, `toBeDisplayed`, `toHaveElementsArrayOfSize`.
- Suspected app bugs: `it.skip(...)` with a `// BUG?` note, never a weaker assertion.

Gold standard: `test/wdio/specs/home.e2e.ts`.

## Selectors, in order of preference
1. `[data-testid="..."]`
2. Accessible name/role: `aria/Submit`, `button=Sign in`
3. Stable id / name attribute: `#email`, `[name="email"]`
4. Stable CSS. Never absolute XPath or hashed class names (`.css-1x9z2`).

## Waits
- Element actions auto-wait; add `waitForDisplayed` / `waitForClickable` only where needed.
- For app state use `browser.waitUntil(() => ..., { timeoutMsg: '...' })`.
- Never `browser.pause()`.

## Data
Shared with the Playwright engine:
- `loadFixture('<feature>', '<CASE-ID>')` from `test/helpers/data/factory.ts`.
- Unique values: `{{unique.email}}`, `{{unique.name}}`, `{{unique.id}}` placeholders.
- Preconditions via `setupX()` in `before`, matching `cleanupX()` in `after`.

## Running
- One spec: `npx wdio run wdio.conf.ts --spec test/wdio/specs/<file>.e2e.ts`
