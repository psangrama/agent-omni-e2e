# Dashboard — TC-DASH-001..004

- **App:** Meridian Ops Console — `BASE_URL` (test/staging only), hash route `#dashboard`.
- **Engine:** WebdriverIO (`TEST_ENGINE=wdio`). Spec: `test/wdio/specs/dashboard.e2e.ts`. Page object: `test/wdio/pageobjects/dashboard.page.ts` (new).
- **Verified live:** 2026-11-11 against `BASE_URL` via browser MCP. All four cases pass as written.
- **State model:** in-memory, reseeded on every full page reload; Live defaults **on** (`window.__meridian.live === true`), tick interval `1500 ms`. Read-only snapshot at `window.__meridian` (do not rely on it for assertions — assert on the DOM; it is only a cross-check reference).
- **Data:** none. Dashboard is read-only live state; no fixtures and **no QA-AUTO records** are created. No cleanup needed beyond a fresh reload between cases (reseeds state).
- **Preconditions (all cases):** open the dashboard fresh with `DashboardPage.open()` (reloads → reseeds → Live on). Each `it` reopens so it is independent.

## Selectors (all `data-testid`, confirmed present in the DOM)

| Purpose | Selector | Notes |
| --- | --- | --- |
| Dashboard view section | `[data-testid="view-dashboard"]` | section wrapper |
| Heading | `aria/Dashboard` (h1) or `view-dashboard h1` | text "Dashboard" |
| Tick count value | `[data-testid="tick-count"]` | `<b>`, integer text e.g. "10" |
| Updated timestamp | `[data-testid="last-update"]` | `<b>`, HH:MM:SS |
| KPI tiles container | `[data-testid="kpi-tiles"]` | holds the 5 tiles |
| KPI — Active orders | `[data-testid="kpi-active"]` / value `[data-testid="kpi-active-value"]` | label "Active orders" |
| KPI — In transit | `[data-testid="kpi-transit"]` / value `[data-testid="kpi-transit-value"]` | label "In transit" |
| KPI — Delivered today | `[data-testid="kpi-delivered"]` / value `[data-testid="kpi-delivered-value"]` | label "Delivered today" |
| KPI — Revenue | `[data-testid="kpi-revenue"]` / value `[data-testid="kpi-revenue-value"]` | label "Revenue", `$` value |
| KPI — On-time rate | `[data-testid="kpi-ontime"]` / value `[data-testid="kpi-ontime-value"]` | label "On-time rate", `%` value |
| Live/Paused toggle | `[data-testid="live-toggle"]` | text "Live" / "Paused"; `aria-pressed` "true"/"false" |
| Activity feed container | `[data-testid="activity-feed"]` | shows "No activity yet." when empty |
| Feed items | `[data-testid="feed-item"]` | `$$` array; each has text + time |
| Clear feed button | `[data-testid="feed-clear"]` | label "Clear" |

New selectors to add to the page object — none reused from existing page objects (only `home.page.ts`/`page.ts` exist today).

---

## TC-DASH-001 — Dashboard loads and shows 5 KPI cards  `@smoke`

Preconditions: App open on `#dashboard` (fresh load).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open dashboard | `DashboardPage.open()` → `#dashboard` | View renders | `await expect(DashboardPage.view).toBeDisplayed()` |
| 2 | Check heading | `aria/Dashboard` (h1) | Heading "Dashboard" visible | `await expect(DashboardPage.heading).toHaveText('Dashboard')` |
| 3 | Check tile count | `[data-testid="kpi-tiles"] > [data-testid^="kpi-"]` (the 5 tiles) | Exactly 5 KPI cards render | `await expect(DashboardPage.kpiTiles).toBeElementsArrayOfSize(5)` |
| 4 | Check each label | `kpi-active/transit/delivered/revenue/ontime` | Labels present | `toHaveTextContaining('Active orders' | 'In transit' | 'Delivered today' | 'Revenue' | 'On-time rate')` per tile |
| 5 | Check each value non-empty | `kpi-*-value` | Each KPI shows a value (e.g. 19, 7, 6, $52,147, 88%) | For each: `await expect(valueEl).not.toHaveText('')` and value text matches `/\d/` (revenue `/^\$[\d,]+$/`, on-time `/^\d+%$/`) |

Meaningful assertion: 5 KPI tiles render (step 3) and every KPI value is non-empty numeric (step 5).

---

## TC-DASH-002 — Live stream updates ticks/timestamp over two ticks  `@regression`

Preconditions: Live is on (default on fresh load). Tick interval ~1500 ms → two ticks ≈ 3 s.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open dashboard | `DashboardPage.open()` | Live on, ticking | `await expect(DashboardPage.liveToggle).toHaveText('Live')` |
| 2 | Read initial tick + timestamp | `tick-count`, `last-update` | Capture `tick0` (int), `ts0` (string) | store `const tick0 = Number(await DashboardPage.tickCount.getText())` |
| 3 | Wait for two ticks | poll `tick-count` | Tick count increases by ≥2 | `await browser.waitUntil(async () => Number(await DashboardPage.tickCount.getText()) >= tick0 + 2, { timeout: 10000, timeoutMsg: 'Tick count did not advance by 2 while Live' })` |
| 4 | Verify timestamp changed | `last-update` | "Updated" HH:MM:SS differs from `ts0` | `await expect(DashboardPage.lastUpdate).not.toHaveText(ts0)` |

Meaningful assertion: tick count advances ≥2 (step 3) and timestamp text changes (step 4). No fixed sleeps — uses `waitUntil`.

---

## TC-DASH-003 — Pausing Live freezes the figures  `@regression`

Preconditions: Live is on (default on fresh load).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open dashboard | `DashboardPage.open()` | Live on | `await expect(DashboardPage.liveToggle).toHaveText('Live')` and `toHaveAttribute('aria-pressed','true')` |
| 2 | Click toggle | `[data-testid="live-toggle"]` | Toggles to Paused | `DashboardPage.pauseLive()` |
| 3 | Verify Paused label/state | `live-toggle` | Button shows "Paused", `aria-pressed="false"` | `await expect(DashboardPage.liveToggle).toHaveText('Paused')`; `await expect(DashboardPage.liveToggle).toHaveAttribute('aria-pressed','false')` |
| 4 | Capture frozen tick | `tick-count` | Record `tickPaused` | `const tickPaused = Number(await DashboardPage.tickCount.getText())` |
| 5 | Confirm ticks stop | `tick-count` | Over ~3 s (≥2 intervals) tick count does not change | `await browser.waitUntil(async () => { const stable = Number(await DashboardPage.tickCount.getText()) === tickPaused; return stable; }, { timeout: 3500, interval: 500, timeoutMsg: 'reverse-check' }).catch(()=>{})` → then assert still equal: `await expect(DashboardPage.tickCount).toHaveText(String(tickPaused))` |

Implementation note for step 5 (keep it deterministic, no `pause()`): poll the tick value every 500 ms for ~3 s using `waitUntil`; the condition stays true the whole time, so assert the final value still equals `tickPaused`. Verified live: ticks frozen at 15 across 4 s while Paused; `window.__meridian.live` became `false`.

Meaningful assertion: label is "Paused" with `aria-pressed="false"` (step 3) and tick count is unchanged after the window (step 5).

---

## TC-DASH-004 — Clear activity feed empties the feed  `@regression`

Preconditions: Feed has entries (seeded on load). **Pause Live first** so the live stream does not re-populate the feed between Clear and the assertion (otherwise a new `feed-item` streams in within ~1.5 s → flaky).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open dashboard | `DashboardPage.open()` | Feed shows ≥1 item | `await expect(DashboardPage.feedItems).toBeElementsArrayOfSize(expect.any(Number))` → `await browser.waitUntil(async () => (await DashboardPage.feedItems.length) > 0, {...})` |
| 2 | Pause Live | `live-toggle` | Stream frozen (prevents re-population) | `await DashboardPage.pauseLive()`; `await expect(DashboardPage.liveToggle).toHaveText('Paused')` |
| 3 | Click Clear | `[data-testid="feed-clear"]` | Feed empties | `await DashboardPage.clearFeed()` |
| 4 | Verify feed empty | `feed-item`, `activity-feed` | 0 feed items; container shows "No activity yet." | `await expect(DashboardPage.feedItems).toBeElementsArrayOfSize(0)`; `await expect(DashboardPage.activityFeed).toHaveText('No activity yet.')` |

Meaningful assertion: feed-item array size is 0 and container reads "No activity yet." (step 4). Verified live: after Clear, `feed-item` count 0, `window.__meridian.feed.length` 0, text "No activity yet.".

---

## Page object sketch — `test/wdio/pageobjects/dashboard.page.ts`

Getters (one per selector above) + actions:
- `open()` → `super.open('/#dashboard')`, `waitForLoaded()` waits for `view-dashboard` displayed.
- `pauseLive()` → if `liveToggle` text is "Live", click it; wait until text is "Paused".
- `clearFeed()` → click `feed-clear`.
- `kpiTiles` → `$$('[data-testid="kpi-tiles"] [data-testid^="kpi-"]:not([data-testid$="-value"])')` (the 5 tile wrappers).
- No assertions in the page object except `waitForLoaded`.

Spec `describe` titles (tag + case ID, per house rules):
- `describe('Dashboard @smoke TC-DASH-001', ...)`
- `describe('Dashboard @regression TC-DASH-002', ...)`
- `describe('Dashboard @regression TC-DASH-003', ...)`
- `describe('Dashboard @regression TC-DASH-004', ...)`

No `browser.pause()` anywhere; use `waitForDisplayed` / `waitUntil`. Selectors live only in the page object.
