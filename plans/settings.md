# Settings — TC-SET-001..008

- **App:** Meridian Ops Console — `BASE_URL` (test/staging only), hash route `#settings`.
- **Engine:** WebdriverIO (`TEST_ENGINE=wdio`). Spec: `test/wdio/specs/settings.e2e.ts`. Page object: `test/wdio/pageobjects/settings.page.ts` (new).
- **Verified live:** 2026-11-11 against `BASE_URL` via browser MCP. All cases pass as written **except TC-SET-007, which is intentionally `it.skip` (safety) and was NOT exercised**.
- **State model:** in-memory, reseeded on every full page reload. Live defaults **on** (`window.__meridian.live === true`); tick interval default `1500 ms` (Normal). Read-only snapshot at `window.__meridian` — assert on the DOM; `window.__meridian` is only a cross-check reference, never the primary assertion target.
- **Data:** none from fixtures. Settings is control-only. TC-SET-006 pushes **one app-generated order** (id like `ORD-1047`, e.g. customer "Fourth Coffee") — this is **not** a QA-AUTO record and cannot be deleted individually, so the spec restores state with a **full page reload (reseed)** in `afterEach`/at the end of the case. No QA-AUTO records are created; no cleanup of other records.
- **Preconditions (all cases):** open settings fresh with `SettingsPage.open()` (reloads → reseeds → Live on, theme light, interval Normal, notify off). Each `it` reopens so it is independent.
- **Theme mechanism (verified):** dark theme is reflected as `<html data-theme="dark">`; light as `<html data-theme="light">` (or attribute absent on first load). The header `theme-toggle` and the `set-dark` checkbox mirror each other **bidirectionally**.
- **Live mechanism (verified):** `set-live` checkbox, header `live-toggle` button, and `window.__meridian.live` all mirror. `live-toggle` text is "Live"/"Paused" with `aria-pressed` "true"/"false".
- **Interval mapping (verified):** Slow → `intervalMs 2500`, Normal → `1500` (default, pressed on load), Fast → `700`. Segment buttons carry `aria-pressed`.
- **Toast (verified):** toggling `set-notify` appends a transient `[data-testid="toast"]` (role `status`, class `toast good`) into `toast-stack` — "Notifications on" when enabling, "Notifications off" when disabling. It auto-dismisses, so assert while displayed (web-first wait), never with a fixed sleep.

## Selectors (all `data-testid`, confirmed present in the DOM)

| Purpose | Selector | Notes |
| --- | --- | --- |
| Settings view section | `[data-testid="view-settings"]` | section wrapper |
| Heading | `[data-testid="view-settings"] h1` | text "Settings" |
| Section headings | `[data-testid="view-settings"] h2` | "Preferences", "Data", "Automation hooks" (3, in order) |
| Live updates toggle | `[data-testid="set-live"]` | `<input type=checkbox>`, checked = Live on (default checked) |
| Dark theme toggle | `[data-testid="set-dark"]` | `<input type=checkbox>`, checked = dark (default unchecked) |
| Desktop notifications toggle | `[data-testid="set-notify"]` | `<input type=checkbox>`, default unchecked |
| Update interval group | `[data-testid="set-interval"]` | `role="group"`, holds 3 segment buttons |
| Interval segment "Slow" | `[data-testid="set-interval"] button` + `aria/Slow` (name) | no own testid → select by accessible name within the group |
| Interval segment "Normal" | `[data-testid="set-interval"]` + name "Normal" | default `aria-pressed="true"` |
| Interval segment "Fast" | `[data-testid="set-interval"]` + name "Fast" | — |
| Reset data button | `[data-testid="reset-data"]` | **LOCATE ONLY — NEVER CLICK** (see TC-SET-007) |
| Add order button | `[data-testid="add-random"]` | label "Add order"; pushes one generated order |
| Toast stack container | `[data-testid="toast-stack"]` | holds transient toasts |
| Toast | `[data-testid="toast-stack"] [data-testid="toast"]` | role `status`; auto-dismisses |
| Automation hooks block | `[data-testid="view-settings"] h2` ("Automation hooks") + following `p` | documents testid scheme / hash routing / `window.__meridian` |
| Header Live/Paused toggle (mirror) | `[data-testid="live-toggle"]` | text "Live"/"Paused", `aria-pressed` |
| Header theme toggle (mirror) | `[data-testid="theme-toggle"]` | header "◐" button |
| `<html>` theme attribute (mirror check) | `html[data-theme]` | "dark" / "light" |

Reuse: `OrdersPage.matchCount` (`[data-testid="order-match-count"]`, text "N orders match") already exists in `test/wdio/pageobjects/orders.page.ts` and is reused by TC-SET-006 to read the order count on `#orders`. Header `live-toggle`/`theme-toggle` are global; `SettingsPage` exposes its own getters for them (page objects stay self-contained).

---

## TC-SET-001 — Settings loads with Preferences, Data, and Automation hooks sections  `@smoke`

Preconditions: App open on `#settings` (fresh load).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` → `#settings` | View renders | `await expect(SettingsPage.view).toBeDisplayed()` |
| 2 | Check heading | `view-settings h1` | Heading "Settings" | `await expect(SettingsPage.heading).toHaveText('Settings')` |
| 3 | Check 3 section headings | `view-settings h2` | Exactly 3 sections | `await expect(SettingsPage.sectionHeadings).toBeElementsArrayOfSize(3)` |
| 4 | Preferences present | `set-live`, `set-dark`, `set-notify`, `set-interval` | Preferences controls render | `await expect(SettingsPage.liveToggle).toBeDisplayed()`; `toBeDisplayed()` for `darkToggle`, `notifyToggle`, `intervalGroup` |
| 5 | Data present | `reset-data`, `add-random` | Data controls render | `await expect(SettingsPage.resetDataBtn).toBeDisplayed()`; `await expect(SettingsPage.addOrderBtn).toBeDisplayed()` |
| 6 | Automation hooks present | `automationHooks` text | Hooks block renders | `await expect(SettingsPage.automationHooks).toBeDisplayed()` |

Meaningful assertion: 3 section headings render (step 3) and one signature control of each section is displayed (steps 4–6). Do **not** click Reset data here.

---

## TC-SET-002 — Toggle "Live updates" pauses/resumes the feed; mirrors header  `@regression`

Preconditions: Live on (default on fresh load); header reads "Live".

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Live on | `await expect(SettingsPage.headerLiveToggle).toHaveText('Live')`; `await expect(SettingsPage.liveToggle).toBeSelected()` |
| 2 | Toggle Live updates off | `[data-testid="set-live"]` | Feed pauses; header mirrors | `await SettingsPage.setLiveUpdates(false)` |
| 3 | Verify checkbox off | `set-live` | Unchecked | `await expect(SettingsPage.liveToggle).not.toBeSelected()` |
| 4 | Verify header mirror = Paused | `live-toggle` | Header shows "Paused", `aria-pressed="false"` | `await expect(SettingsPage.headerLiveToggle).toHaveText('Paused')`; `await expect(SettingsPage.headerLiveToggle).toHaveAttribute('aria-pressed','false')` |
| 5 | Toggle Live updates on | `set-live` | Resumes | `await SettingsPage.setLiveUpdates(true)` |
| 6 | Verify header mirror = Live | `live-toggle` | Header back to "Live", `aria-pressed="true"` | `await expect(SettingsPage.headerLiveToggle).toHaveText('Live')`; `toHaveAttribute('aria-pressed','true')` |

Meaningful assertion: header `live-toggle` text + `aria-pressed` mirror the `set-live` checkbox in both directions (steps 4 and 6). Verified live: `set-live` off → header "Paused"/`aria-pressed=false`, `window.__meridian.live=false`.

---

## TC-SET-003 — Toggle "Dark theme"; mirrors header theme toggle  `@regression`

Preconditions: Theme light on fresh load (`set-dark` unchecked).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Light theme | `await expect(SettingsPage.darkToggle).not.toBeSelected()`; `await expect(SettingsPage.htmlThemeIs('dark')).resolves.toBe(false)` (html `data-theme` ≠ "dark") |
| 2 | Enable Dark theme | `[data-testid="set-dark"]` | Theme switches to dark | `await SettingsPage.setDarkTheme(true)` |
| 3 | Verify html attribute | `html[data-theme]` | `<html data-theme="dark">` | `await browser.waitUntil(async () => (await SettingsPage.htmlTheme()) === 'dark', { timeoutMsg: 'theme did not switch to dark' })` |
| 4 | Verify checkbox on | `set-dark` | Checked | `await expect(SettingsPage.darkToggle).toBeSelected()` |
| 5 | Click header theme toggle | `[data-testid="theme-toggle"]` | Mirror: reverts to light and unchecks `set-dark` | `await SettingsPage.headerThemeToggle.click()` |
| 6 | Verify mirror | `html[data-theme]`, `set-dark` | `data-theme="light"` and `set-dark` unchecked | `await browser.waitUntil(async () => (await SettingsPage.htmlTheme()) === 'light', {...})`; `await expect(SettingsPage.darkToggle).not.toBeSelected()` |

Meaningful assertion: enabling `set-dark` sets `<html data-theme="dark">` (step 3) and the header `theme-toggle` reverts it to "light" while unchecking `set-dark` (step 6 — bidirectional mirror). Verified live.

---

## TC-SET-004 — Enable "Desktop notifications" shows a confirmation toast  `@regression`

Preconditions: On settings, notifications off (default).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Notify off | `await expect(SettingsPage.notifyToggle).not.toBeSelected()` |
| 2 | Enable Desktop notifications | `[data-testid="set-notify"]` | Checkbox checked; toast appears | `await SettingsPage.notifyToggle.click()` |
| 3 | Verify checkbox on | `set-notify` | Checked | `await expect(SettingsPage.notifyToggle).toBeSelected()` |
| 4 | Verify toast appears | `[data-testid="toast-stack"] [data-testid="toast"]` | A confirmation toast is displayed with "Notifications on" (auto-dismisses) | `await SettingsPage.toast.waitForDisplayed({ timeout: 5000 })`; `await expect(SettingsPage.toast).toHaveText('Notifications on')` |

Meaningful assertion: a `[data-testid="toast"]` becomes displayed and reads "Notifications on" after enabling (step 4). No fixed sleep — `waitForDisplayed` catches the transient toast. Verified live (also "Notifications off" on disable).

---

## TC-SET-005 — Update interval Slow/Normal/Fast; selected segment pressed, tick rate changes  `@regression`

Preconditions: On settings; default interval "Normal" pressed (`intervalMs 1500`).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Normal pressed | `await expect(SettingsPage.intervalSegment('Normal')).toHaveAttribute('aria-pressed','true')` |
| 2 | Click "Fast" | `set-interval` → name "Fast" | Fast becomes pressed, others not | `await SettingsPage.selectInterval('Fast')` |
| 3 | Verify Fast pressed | `intervalSegment('Fast')` / others | Fast `aria-pressed="true"`; Slow & Normal "false" | `await expect(SettingsPage.intervalSegment('Fast')).toHaveAttribute('aria-pressed','true')`; `await expect(SettingsPage.intervalSegment('Normal')).toHaveAttribute('aria-pressed','false')` |
| 4 | Click "Slow" | `set-interval` → name "Slow" | Slow becomes pressed | `await SettingsPage.selectInterval('Slow')` |
| 5 | Verify Slow pressed | `intervalSegment('Slow')` / others | Slow `aria-pressed="true"`; Fast & Normal "false" | `await expect(SettingsPage.intervalSegment('Slow')).toHaveAttribute('aria-pressed','true')`; `await expect(SettingsPage.intervalSegment('Fast')).toHaveAttribute('aria-pressed','false')` |

Meaningful assertion: the clicked segment becomes `aria-pressed="true"` and the others "false" (steps 3 and 5 — mutually-exclusive pressed state). Tick-rate change cross-check (verified live, not a DOM assertion): `window.__meridian.intervalMs` Fast=700, Slow=2500, Normal=1500. The pressed-state assertion is the deterministic DOM proof the selection took effect.

---

## TC-SET-006 — "Add order" pushes a generated order → Orders count +1  `@regression`

Preconditions: On settings. **Pause Live first** so the live stream does not change the order count concurrently (deterministic +1). Restore via full reload at the end.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Settings loaded | `await expect(SettingsPage.view).toBeDisplayed()` |
| 2 | Pause Live | `set-live` | Feed frozen (no background count changes) | `await SettingsPage.setLiveUpdates(false)`; `await expect(SettingsPage.headerLiveToggle).toHaveText('Paused')` |
| 3 | Read baseline order count | `OrdersPage.open()` then `OrdersPage.matchCount` | Capture `N` from "N orders match" | `await OrdersPage.open()`; `const n0 = parseInt((await OrdersPage.matchCount.getText()).match(/\d+/)[0], 10)` |
| 4 | Back to settings, Add order | `[data-testid="add-random"]` | One generated order queued | `await SettingsPage.open()`; `await SettingsPage.addOrder()` (note: reopen pauses state again — instead keep SettingsPage via `browser.url('/#settings')` without reseed; see implementation note) |
| 5 | Re-read order count | `OrdersPage.open()` → `matchCount` | Count is `N+1` | `await browser.waitUntil(async () => { await OrdersPage.open(); return parseInt((await OrdersPage.matchCount.getText()).match(/\d+/)[0],10) === n0 + 1; }, { timeout: 5000, timeoutMsg: 'order count did not increase by 1' })` |
| 6 | Restore state | full page reload | Dataset reseeded; generated order gone | `await browser.url('/#dashboard'); await browser.refresh()` (or `SettingsPage.open()` which reloads) |

Implementation note: `SettingsPage.open()` does a **full reload → reseed**, which would discard the added order and reset the baseline. So within this case, navigate between views with hash changes only (`browser.url('/#settings')` / `OrdersPage.openNoReload()` or read count without `open()`), and do the single reseed **only** in step 6 (restore). Do the baseline read (step 3) and the Add-order click (step 4) without an intervening full reload. The generated order is **app-generated, not QA-AUTO**, and must not be edited or deleted individually — restoration is by reseed only.

Meaningful assertion: the Orders match-count increases by exactly 1 after clicking Add order (step 5). Verified live: count 46 → 47, new order `ORD-1047` ("Fourth Coffee"), restored to seed by full reload.

---

## TC-SET-007 — "Reset data" restores seeded state  `@regression`  **— SKIPPED (safety)**

> **DO NOT EXECUTE LIVE. SAFETY-CRITICAL.** `reset-data` resets the **entire shared demo dataset** for the environment (orders, fleet, counters) for every user of the shared testbed. It was blocked during exploration as a shared-resource mutation and was **not** clicked during planning. Implement as `it.skip` with a `// BUG?`-style `needs-test-data` note. It may run **only** against an isolated / reset-safe environment, never the shared `BASE_URL` testbed.

Planned (for an isolated environment only — gated behind `it.skip`):

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Settings loaded | `await expect(SettingsPage.view).toBeDisplayed()` |
| 2 | Locate Reset data (do not click on shared env) | `[data-testid="reset-data"]` | Button present/enabled | `await expect(SettingsPage.resetDataBtn).toBeDisplayed()` |
| 3 | *(isolated env only)* Mutate then Reset | `add-random` ×k, then `reset-data` | Orders/fleet/counters return to initial seed | `await expect(OrdersPage.matchCount).toHaveText(/\d+ orders match/)` back to seed count |

Spec: `it.skip('resets the shared demo dataset to seed — isolated env only // BUG? needs-test-data: resets whole shared testbed, blocked during exploration', ...)`. The **only** live action the automated suite performs for this case on `BASE_URL` is locating the selector (step 2); the reset itself (step 3) stays skipped.

Meaningful assertion (when un-skipped on an isolated env): seed counts restored (step 3). On the shared testbed the case asserts nothing beyond selector presence and remains skipped.

---

## TC-SET-008 — Automation-hooks info block documents the testid scheme  `@regression`

Preconditions: On settings.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open settings | `SettingsPage.open()` | Settings loaded | `await expect(SettingsPage.view).toBeDisplayed()` |
| 2 | Read hooks heading | `view-settings h2` "Automation hooks" | Heading present | `await expect(SettingsPage.automationHooksHeading).toHaveText('Automation hooks')` |
| 3 | Verify documents `data-testid` | `automationHooks` text | Mentions the `data-testid` scheme | `await expect(SettingsPage.automationHooks).toHaveText('data-testid', { containing: true })` |
| 4 | Verify documents hash routing | `automationHooks` text | Mentions hash routing (e.g. `#orders`) | `await expect(SettingsPage.automationHooks).toHaveText('#orders', { containing: true })` |
| 5 | Verify documents snapshot global | `automationHooks` text | Mentions `window.__meridian` | `await expect(SettingsPage.automationHooks).toHaveText('window.__meridian', { containing: true })` |

Meaningful assertion: the hooks block text contains all three documented hooks — `data-testid`, hash routing (`#orders`), and `window.__meridian` (steps 3–5). Verified live: block text includes `data-testid="view-*"`, `nav-*`, `orders-table`/`fleet-table`, `live-toggle`, `reset-data`, `#orders`, and `window.__meridian`.

---

## Page object sketch — `test/wdio/pageobjects/settings.page.ts`

```ts
import Page from './page.js';

/**
 * Meridian Ops Console — Settings view (hash route `#settings`).
 * Selectors live here only. Control-only screen; no QA-AUTO records created.
 * reset-data is exposed for documentation/presence checks ONLY — never clicked by the suite
 * on the shared testbed (see TC-SET-007).
 */
class SettingsPage extends Page {
    protected path = '/#settings';

    get view() { return $('[data-testid="view-settings"]'); }
    get heading() { return $('[data-testid="view-settings"] h1'); }
    get sectionHeadings() { return $$('[data-testid="view-settings"] h2'); }

    // Preferences
    get liveToggle() { return $('[data-testid="set-live"]'); }
    get darkToggle() { return $('[data-testid="set-dark"]'); }
    get notifyToggle() { return $('[data-testid="set-notify"]'); }
    get intervalGroup() { return $('[data-testid="set-interval"]'); }
    intervalSegment(name: 'Slow' | 'Normal' | 'Fast') {
        return this.intervalGroup.$(`aria/${name}`); // segment buttons have no own testid
    }

    // Data
    get resetDataBtn() { return $('[data-testid="reset-data"]'); } // LOCATE ONLY — never click on shared env
    get addOrderBtn() { return $('[data-testid="add-random"]'); }

    // Toast + automation hooks
    get toast() { return $('[data-testid="toast-stack"] [data-testid="toast"]'); }
    get automationHooksHeading() {
        return this.view.$('h2*=Automation hooks');
    }
    get automationHooks() {
        // the <p> following the "Automation hooks" heading
        return $('[data-testid="view-settings"] h2 + p, [data-testid="view-settings"] p*=window.__meridian');
    }

    // Header mirrors (global controls)
    get headerLiveToggle() { return $('[data-testid="live-toggle"]'); }
    get headerThemeToggle() { return $('[data-testid="theme-toggle"]'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.view.waitForDisplayed();
    }

    /** Current <html data-theme> value ('dark' | 'light' | null). */
    async htmlTheme(): Promise<string | null> {
        return browser.execute(() => document.documentElement.getAttribute('data-theme'));
    }
    async htmlThemeIs(value: string): Promise<boolean> {
        return (await this.htmlTheme()) === value;
    }

    /** Set a checkbox preference to a desired state, clicking only if needed. */
    private async setChecked(el: WebdriverIO.Element, want: boolean) {
        if ((await el.isSelected()) !== want) await el.click();
        await browser.waitUntil(async () => (await el.isSelected()) === want,
            { timeout: 5000, timeoutMsg: 'checkbox did not reach desired state' });
    }
    async setLiveUpdates(on: boolean) { await this.setChecked(await this.liveToggle, on); }
    async setDarkTheme(on: boolean)   { await this.setChecked(await this.darkToggle, on); }

    async selectInterval(name: 'Slow' | 'Normal' | 'Fast') {
        await this.intervalSegment(name).click();
        await browser.waitUntil(
            async () => (await this.intervalSegment(name).getAttribute('aria-pressed')) === 'true',
            { timeout: 5000, timeoutMsg: `interval ${name} did not become pressed` });
    }

    async addOrder() { await this.addOrderBtn.click(); }
}

export default new SettingsPage();
```

- No assertions in the page object except `waitForLoaded`.
- `reset-data` getter exists for presence/documentation checks only; **no page-object action clicks it** on the shared testbed.
- TC-SET-006 reuses `OrdersPage.matchCount` (existing `orders.page.ts`) to read the order count; avoid a full reload between the baseline read and the Add-order click (reload reseeds).

Spec `describe` titles (tag + case ID, per house rules):
- `describe('Settings @smoke TC-SET-001', ...)`
- `describe('Settings @regression TC-SET-002', ...)`
- `describe('Settings @regression TC-SET-003', ...)`
- `describe('Settings @regression TC-SET-004', ...)`
- `describe('Settings @regression TC-SET-005', ...)`
- `describe('Settings @regression TC-SET-006', ...)`
- `describe('Settings @regression TC-SET-007', ...)` → body is `it.skip(... // BUG? needs-test-data ...)`
- `describe('Settings @regression TC-SET-008', ...)`

No `browser.pause()` anywhere; use `waitForDisplayed` / `waitUntil`. Selectors live only in the page object. Only `BASE_URL` (test/staging) is ever targeted; **Reset data is never clicked on the shared testbed.**
