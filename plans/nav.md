# Global navigation & controls — TC-NAV-001..005

- **App:** Meridian Ops Console (hash-routed SPA) at `BASE_URL` (`https://mytestbed.psangrama.in`). Read-only chrome, present on every view. A full page reload reseeds in-memory demo data; `Live` defaults **on**.
- **Engine:** WebdriverIO (`TEST_ENGINE=wdio`). Spec → `test/wdio/specs/nav.e2e.ts`. Selectors confined to page object → `test/wdio/pageobjects/nav.page.ts`.
- **Data:** none. These cases are read-only — no fixtures, no helpers, no `QA-AUTO-` records. Each `it` reopens the view so state is fresh and the case is independent.
- **Waits:** engine auto-wait plus `waitForDisplayed` / `browser.waitUntil`; **no** `browser.pause()`.

> **Live-verification status:** the browser MCP (`playwright-mcp`) is not approved this session, so no DOM walk-through was performed. Selectors below are the `data-testid`s confirmed by prior agents (explorer catalog + nav facts). Two points the **generator must confirm against the live DOM on its first `npx wdio` run** and fix in the page object only (never the expected values):
> 1. **Active-nav state** — the exact mechanism. Candidates, in order of preference: (a) `aria-current="page"` on the active `nav-*` button; (b) `aria-pressed="true"` on the active button — **but `nav-intake` is confirmed to have NO `aria-pressed`, so this attribute cannot be the cross-view mechanism**; (c) an active CSS class (e.g. `is-active`/`active`). Prefer an accessibility attribute; use the class only if no attribute distinguishes the active item. See "Active-state assertion" note per case.
> 2. **Theme-toggle default + direction** — assert the *change* of `<html data-theme>` across a click, not a fixed start value (seed theme may be light or system).

## Page object sketch — `test/wdio/pageobjects/nav.page.ts`

```ts
import Page from './page.js';

/**
 * Meridian Ops Console — global chrome (primary nav + header controls).
 * Present on every view. Selectors live here only. Read-only; no records created.
 */
class NavPage extends Page {
    protected path = '/#dashboard';

    // Primary nav buttons
    get navDashboard() { return $('[data-testid="nav-dashboard"]'); }
    get navOrders()    { return $('[data-testid="nav-orders"]'); }
    get navFleet()     { return $('[data-testid="nav-fleet"]'); }
    get navIntake()    { return $('[data-testid="nav-intake"]'); }   // New Order; note: NO aria-pressed
    get navSettings()  { return $('[data-testid="nav-settings"]'); }

    // Views (one per route)
    get viewDashboard() { return $('[data-testid="view-dashboard"]'); }
    get viewOrders()    { return $('[data-testid="view-orders"]'); }
    get viewFleet()     { return $('[data-testid="view-fleet"]'); }
    get viewIntake()    { return $('[data-testid="view-intake"]'); }
    get viewSettings()  { return $('[data-testid="view-settings"]'); }

    // Header controls
    get liveToggle()  { return $('[data-testid="live-toggle"]'); }
    get themeToggle() { return $('[data-testid="theme-toggle"]'); }

    /** Read the <html data-theme> attribute (e.g. "dark" | "light" | null). */
    async theme(): Promise<string | null> {
        return browser.execute(() => document.documentElement.getAttribute('data-theme'));
    }

    /**
     * Whether a nav button is the active one. GENERATOR: confirm the live mechanism and
     * keep ONLY the branch that is correct (prefer aria-current). nav-intake has no
     * aria-pressed, so aria-pressed cannot be the cross-view signal.
     */
    async isNavActive(el: WebdriverIO.Element): Promise<boolean> {
        return browser.execute((node: Element) => {
            return node.getAttribute('aria-current') === 'page'
                || node.getAttribute('aria-pressed') === 'true'
                || /(^|\s)(is-active|active)(\s|$)/.test(node.className);
        }, el as unknown as Element);
    }

    async clickLive()  { await this.liveToggle.click(); }
    async clickTheme() { await this.themeToggle.click(); }
}

export default new NavPage();
```

---

## TC-NAV-001 — Primary nav routes to each view (`@smoke`)

`describe('Navigation @smoke TC-NAV-001', ...)`

Preconditions: app open on `#dashboard`.
Data: none.

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Open the app | `NavPage.open()` (`/#dashboard`) | Dashboard view rendered | `expect(NavPage.viewDashboard).toBeDisplayed()` |
| 2 | Click Orders | `[data-testid="nav-orders"]` | Hash `#orders`; Orders view renders | `expect(browser).toHaveUrl(expect.stringContaining('#orders'))`; `expect(NavPage.viewOrders).toBeDisplayed()` |
| 3 | Click Fleet | `[data-testid="nav-fleet"]` | Hash `#fleet`; Fleet view renders | `toHaveUrl` contains `#fleet`; `expect(NavPage.viewFleet).toBeDisplayed()` |
| 4 | Click New Order | `[data-testid="nav-intake"]` | Hash `#intake`; Intake view renders | `toHaveUrl` contains `#intake`; `expect(NavPage.viewIntake).toBeDisplayed()` |
| 5 | Click Settings | `[data-testid="nav-settings"]` | Hash `#settings`; Settings view renders | `toHaveUrl` contains `#settings`; `expect(NavPage.viewSettings).toBeDisplayed()` |
| 6 | Click Dashboard | `[data-testid="nav-dashboard"]` | Back to `#dashboard`; Dashboard renders | `toHaveUrl` contains `#dashboard`; `expect(NavPage.viewDashboard).toBeDisplayed()` |

Notes: after each click, add `await NavPage.view*.waitForDisplayed()` before the URL assertion so the hash-router swap settles. The `@smoke` meaningful assertion is the view-renders check on each route; the hash check backs it up.

---

## TC-NAV-002 — Deep-link by URL hash (`@regression`)

`describe('Navigation @regression TC-NAV-002', ...)`

Preconditions: none (fresh load).
Data: none.

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Navigate directly to `#fleet` | `NavPage.open('/#fleet')` | Fleet view renders without going via Dashboard first | `expect(NavPage.viewFleet).toBeDisplayed()` |
| 2 | Confirm URL | — | Hash is `#fleet` | `expect(browser).toHaveUrl(expect.stringContaining('#fleet'))` |
| 3 | Confirm Fleet nav active | `[data-testid="nav-fleet"]` | Fleet nav button shows active state | `expect(await NavPage.isNavActive(await NavPage.navFleet)).toBe(true)` — see Active-state note |

Active-state note: if the generator confirms `aria-current`, prefer the direct matcher `expect(NavPage.navFleet).toHaveAttribute('aria-current', 'page')` and drop the helper. Keep at least this one meaningful active-state assertion.

---

## TC-NAV-003 — Active nav item is highlighted (`@regression`)

`describe('Navigation @regression TC-NAV-003', ...)`

Preconditions: on a known view (open `#orders`).
Data: none.

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Open `#orders` | `NavPage.open('/#orders')` | Orders view renders | `expect(NavPage.viewOrders).toBeDisplayed()` |
| 2 | Check Orders nav active | `[data-testid="nav-orders"]` | Orders nav has active state | `expect(await NavPage.isNavActive(await NavPage.navOrders)).toBe(true)` |
| 3 | Check a non-current nav is NOT active | `[data-testid="nav-fleet"]` | Fleet nav has no active state | `expect(await NavPage.isNavActive(await NavPage.navFleet)).toBe(false)` |

Active-state note: step 2 is the core assertion; step 3 proves the highlight is exclusive. GENERATOR: confirm the live attribute/class and, if it is `aria-current`, replace the helper with `toHaveAttribute('aria-current', 'page')` / `not.toHaveAttribute('aria-current', 'page')`. Do not weaken this to "some element is highlighted" — tie it to the specific current button.

---

## TC-NAV-004 — Header Live/Paused toggle (`@regression`)

`describe('Navigation @regression TC-NAV-004', ...)`

Preconditions: any view, Live on by default after a fresh load.
Data: none.

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Open the app | `NavPage.open()` | Chrome present; toggle shows "Live" | `expect(NavPage.liveToggle).toHaveText('Live')`; `expect(NavPage.liveToggle).toHaveAttribute('aria-pressed', 'true')` |
| 2 | Click the Live/Paused toggle | `[data-testid="live-toggle"]` | Flips to Paused (not pressed) | `expect(NavPage.liveToggle).toHaveText('Paused')`; `expect(NavPage.liveToggle).toHaveAttribute('aria-pressed', 'false')` |
| 3 | Click again | `[data-testid="live-toggle"]` | Flips back to Live (pressed) | `expect(NavPage.liveToggle).toHaveText('Live')`; `expect(NavPage.liveToggle).toHaveAttribute('aria-pressed', 'true')` |

Notes: label text + `aria-pressed` are both confirmed on this control. Assert both so a text-only or attribute-only regression is caught. No sleeps; `toHaveText` auto-waits for the label to settle.

---

## TC-NAV-005 — Header theme toggle switches theme (`@regression`)

`describe('Navigation @regression TC-NAV-005', ...)`

Preconditions: any view.
Data: none.

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Open the app | `NavPage.open()` | Chrome present; theme toggle visible | `expect(NavPage.themeToggle).toBeDisplayed()` |
| 2 | Record current theme | `document.documentElement[data-theme]` via `NavPage.theme()` | Capture baseline (`before`) | `const before = await NavPage.theme();` |
| 3 | Click the theme toggle | `[data-testid="theme-toggle"]` | `<html data-theme>` changes | `browser.waitUntil(async () => (await NavPage.theme()) !== before, { timeout: 5000, timeoutMsg: 'theme did not change' })` then `expect(await NavPage.theme()).not.toBe(before)` |
| 4 | Click again | `[data-testid="theme-toggle"]` | Theme returns to the baseline value | `browser.waitUntil(async () => (await NavPage.theme()) === before, ...)`; `expect(await NavPage.theme()).toBe(before)` |

Notes: assert the **change** of `<html data-theme>` across the click, not a hardcoded "dark" — the seed theme may be light. Dark theme is confirmed as `<html data-theme="dark">`; step 3 proves the attribute toggles, step 4 proves it round-trips. The `theme-toggle` accessible name is "Toggle theme" (glyph ◐), kept as a `data-testid` selector per the selector-preference order.

---

## Generator checklist
- Create `test/wdio/pageobjects/nav.page.ts` (sketch above) and `test/wdio/specs/nav.e2e.ts`; selectors only in the page object.
- Confirm against the live DOM on the first `npx wdio run wdio.conf.ts --spec test/wdio/specs/nav.e2e.ts`: (1) the active-nav mechanism — prefer `aria-current="page"`; `aria-pressed` is ruled out as cross-view because `nav-intake` lacks it; (2) theme default/direction. Fix selectors/waits only — never the expected values (CLAUDE.md rule 7).
- If any step's real behaviour differs from the expected result, `it.skip(...)` with a `// BUG?` note and report it (CLAUDE.md rule 6); do not weaken assertions.
