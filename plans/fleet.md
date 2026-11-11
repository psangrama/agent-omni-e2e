# Fleet — plan for approved cases (TEST_ENGINE=wdio)

**App:** Meridian Ops Console — Fleet view, hash route `#fleet`. Read-only live telemetry table
(Vehicle, Driver, Status, Speed, Battery, Zone, Last ping) plus a status summary strip
(On route / Charging / Idle counts). Speed, battery and Last ping tick for On-Route vehicles while
**Live** is on. No auth; a full page reload reseeds the in-memory demo data.

**Engine:** WebdriverIO. Selectors live only in `test/wdio/pageobjects/fleet.page.ts` (sketched below).
**Fixtures:** none — Fleet is read-only, no records created. `window.__meridian` is a **cross-check only**;
all assertions below are **DOM-based** (verified live via browser MCP on 2026-11-11).

Covers: **TC-FLEET-001** (@smoke), **TC-FLEET-002** (@regression), **TC-FLEET-003** (@regression).
Describe titles: `Fleet @smoke TC-FLEET-001`, `Fleet @regression TC-FLEET-002`,
`Fleet @regression TC-FLEET-003`.

---

## Discovered selectors (live) — all go in the page object

| Element | Selector | Notes |
| --- | --- | --- |
| Fleet view | `[data-testid="view-fleet"]` | section wrapper; load check |
| Table | `[data-testid="fleet-table"]` | `<thead>` has 7 `<th>` |
| Body | `[data-testid="fleet-body"]` | `<tbody>` |
| Rows (all) | `[data-testid="fleet-row"]` | one `<tr>` per vehicle; `data-id="VH-01"` … |
| Vehicle cell | row `td:nth-child(1)` | e.g. `VH-01` (also row `data-id`) |
| Driver cell | row `td:nth-child(2)` | — |
| Status cell | row `[data-col="status"]` | badge text `On Route` / `Charging` / `Idle` |
| Speed cell | row `[data-col="speed"]` | e.g. `71 mph` |
| Battery cell | row `[data-col="battery"]` | e.g. `45%` |
| Zone cell | row `td:nth-child(6)` | — |
| Last ping cell | row `td:nth-child(7)` | `HH:MM:SS`, advances each tick |
| Summary: On route | `[data-testid="view-fleet"] #fleetActive` | stable id; `<b>` count |
| Summary: Charging | `[data-testid="view-fleet"] #fleetCharging` | stable id; `<b>` count |
| Summary: Idle | `[data-testid="view-fleet"] #fleetIdle` | stable id; `<b>` count |
| Live/Paused toggle | `[data-testid="live-toggle"]` | header button; text `Live` or `Paused` |

Cells carry no `data-testid`; the stable `data-col` attributes (status/speed/battery) are preferred,
`td:nth-child` only where no `data-col` exists (Vehicle, Driver, Zone, Last ping). Summary counts carry
no `data-testid` but stable ids `#fleetActive/#fleetCharging/#fleetIdle` (selector pref tier 3), scoped
to the fleet view. No absolute XPath, no hashed classes. **BUG?/gap note:** summary counts and cells
lack `data-testid` — not a blocker, stable `id`/`data-col` used; flag to app team if they want testids.

Live-verified snapshot: 7 columns, 8 rows (`VH-01`…`VH-08`); summary `7 / 0 / 1` equalled row totals
`7 / 0 / 1`; VH-01 (On Route) changed `70 mph`→`71 mph`, `49%`→`45%`, ping `23:17:55`→`23:18:04` over ~3 s
with Live on. Statuses migrate between On Route/Charging/Idle across ticks, so FLEET-003 pauses Live first.

---

## TC-FLEET-001 — Fleet table loads with vehicles  (@smoke, P1)

**Preconditions:** App open at `#fleet` (full reload → reseed). Live state irrelevant (structure is stable).
**Data:** none.

| # | Action | Element / selector | Expected result | Assertion (wdio) |
| --- | --- | --- | --- | --- |
| 1 | Open fleet fresh (full reload) | `fleet.open()` → `browser.url('/#fleet')` + `browser.refresh()` | Fleet view renders | `await expect(fleet.view).toBeDisplayed()` |
| 2 | Wait for table | `fleet.table` | Table visible | `await expect(fleet.table).toBeDisplayed()` |
| 3 | Count header columns | `fleet-table thead th` | 7 columns | `await expect(await fleet.headerTexts()).toEqual(['Vehicle','Driver','Status','Speed','Battery','Zone','Last ping'])` |
| 4 | Count vehicle rows | `fleet.rows` | ≥ 1 row | `await expect(fleet.rows).toBeElementsArrayOfSize({ gte: 1 })` |
| 5 | Check first row id format | first row `data-id` | matches `VH-\d+` | `await expect(await fleet.firstVehicleId()).toMatch(/^VH-\d+$/)` |
| 6 | Summary counts shown | `#fleetActive` / `#fleetCharging` / `#fleetIdle` | all displayed, numeric | `await expect(fleet.onRouteCount).toBeDisplayed()` and `toHaveText(expect.stringMatching(/^\d+$/))` for each of the three |

Meaningful assertions: header set equality, row-count ≥1, `VH-` id pattern, numeric summary counts.

---

## TC-FLEET-002 — Telemetry updates while Live is on  (@regression, P2)

**Preconditions:** `#fleet` open, **Live is on** (default after reload — assert, don't toggle).
**Data:** none. **No fixed sleeps — `browser.waitUntil` polling only.**

| # | Action | Element / selector | Expected result | Assertion (wdio) |
| --- | --- | --- | --- | --- |
| 1 | Open fleet fresh | `fleet.open()` | Fleet renders | `await expect(fleet.view).toBeDisplayed()` |
| 2 | Confirm Live is on | `fleet.liveToggle` | Button text `Live` | `await expect(fleet.liveToggle).toHaveText('Live')` |
| 3 | Pick an On-Route vehicle, snapshot its telemetry | first row with status `On Route` | baseline `{speed, battery, lastPing}` captured | `const id = await fleet.firstOnRouteId(); const base = await fleet.telemetry(id);` (plain reads, no assert) |
| 4 | Poll until telemetry changes over a tick | same row `[data-col="speed"]` / `[data-col="battery"]` / ping cell | at least one of speed/battery/Last ping differs from baseline within timeout | `await browser.waitUntil(async () => { const now = await fleet.telemetry(id); return now.speed!==base.speed \|\| now.battery!==base.battery \|\| now.lastPing!==base.lastPing; }, { timeout: 10000, interval: 500, timeoutMsg: 'Fleet telemetry did not update while Live on' })` |
| 5 | Assert the change (web-first) | `fleet.lastPingCell(id)` | Last ping no longer equals baseline | `await expect(fleet.lastPingCell(id)).not.toHaveText(base.lastPing)` |

The `waitUntil` is itself the primary (passing-condition) assertion; step 5 adds an explicit `expect`.
Baseline row chosen by status at runtime so the case stays valid as the seed evolves. No `browser.pause`.

---

## TC-FLEET-003 — Status summary matches per-row status totals  (@regression, P3)

**Preconditions:** `#fleet` loaded. **Pause Live first** so summary and rows are read from one frozen
tick (live churn would otherwise race between reading the summary and counting rows).
**Data:** none.

| # | Action | Element / selector | Expected result | Assertion (wdio) |
| --- | --- | --- | --- | --- |
| 1 | Open fleet fresh | `fleet.open()` | Fleet renders | `await expect(fleet.view).toBeDisplayed()` |
| 2 | Freeze the stream | `fleet.pauseLive()` | Toggle reads `Paused` | `await expect(fleet.liveToggle).toHaveText('Paused')` (inside helper via waitUntil) |
| 3 | Tally statuses from rows | each row `[data-col="status"]` | `{onRoute, charging, idle}` from rows | `const rows = await fleet.statusTotals();` (reads row badges, normalises `On Route`/`Charging`/`Idle`) |
| 4 | Read summary counts | `#fleetActive` / `#fleetCharging` / `#fleetIdle` | `{onRoute, charging, idle}` from strip | `const sum = await fleet.summaryCounts();` |
| 5 | Compare | summary vs row totals | each summary count equals its row total | `await expect(sum).toEqual(rows)` |
| 6 | Sanity: totals cover all rows | `fleet.rows` | sum of three == row count | `await expect(sum.onRoute + sum.charging + sum.idle).toBe(await fleet.rows.length)` |

Meaningful assertion: `sum` object deep-equals the per-row tally (step 5), plus a conservation check (step 6).
Row status badge text `On Route` maps to the summary's `On route` label (case-insensitive normalise in the
helper). Do **not** weaken: if counts diverge even when paused, mark `it.skip` with a `// BUG?` note.

---

## Page object sketch — `test/wdio/pageobjects/fleet.page.ts`

```ts
import Page from './page.js';

/**
 * Meridian Ops Console — Fleet view (hash route `#fleet`).
 * Read-only live telemetry. Selectors live here only; actions carry no assertions
 * (except the page-loaded check). Cells have no data-testid, so stable data-col
 * attributes are used; summary counts use their stable ids scoped to the fleet view.
 */
class FleetPage extends Page {
    protected path = '/#fleet';

    // --- selectors ---
    get view() { return $('[data-testid="view-fleet"]'); }
    get table() { return $('[data-testid="fleet-table"]'); }
    get body() { return $('[data-testid="fleet-body"]'); }
    get rows() { return $$('[data-testid="fleet-row"]'); }
    get liveToggle() { return $('[data-testid="live-toggle"]'); }
    get onRouteCount() { return $('[data-testid="view-fleet"] #fleetActive'); }
    get chargingCount() { return $('[data-testid="view-fleet"] #fleetCharging'); }
    get idleCount() { return $('[data-testid="view-fleet"] #fleetIdle'); }

    /** Row element by vehicle id, e.g. "VH-01". */
    rowById(id: string) { return $(`[data-testid="fleet-row"][data-id="${id}"]`); }

    // cells (stable data-col where present, else positional)
    statusCell(id: string)   { return this.rowById(id).$('[data-col="status"]'); }
    speedCell(id: string)    { return this.rowById(id).$('[data-col="speed"]'); }
    batteryCell(id: string)  { return this.rowById(id).$('[data-col="battery"]'); }
    lastPingCell(id: string) { return this.rowById(id).$('td:nth-child(7)'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.view.waitForDisplayed();
        await this.table.waitForDisplayed();
    }

    /** Full reload → reseeds the in-memory dataset and restores Live=on. */
    async open(): Promise<void> {
        await browser.url(this.path);
        await browser.refresh();
        await this.waitForLoaded();
    }

    /** 7 header texts, trimmed. */
    async headerTexts(): Promise<string[]> {
        const ths = await this.table.$$('thead th');
        const out: string[] = [];
        for (const th of ths) out.push((await th.getText()).trim());
        return out;
    }

    /** data-id of the first visible row (e.g. "VH-01"). */
    async firstVehicleId(): Promise<string> {
        return (await this.rows)[0].getAttribute('data-id');
    }

    /** Normalised status of a row: 'on route' | 'charging' | 'idle'. */
    private norm(s: string) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }

    /** data-id of the first row currently On Route (for the telemetry case). */
    async firstOnRouteId(): Promise<string> {
        for (const r of await this.rows) {
            const s = this.norm(await r.$('[data-col="status"]').getText());
            if (s === 'on route') return r.getAttribute('data-id');
        }
        throw new Error('No On-Route vehicle found');
    }

    /** One telemetry snapshot for a vehicle. */
    async telemetry(id: string): Promise<{ speed: string; battery: string; lastPing: string }> {
        return {
            speed: (await this.speedCell(id).getText()).trim(),
            battery: (await this.batteryCell(id).getText()).trim(),
            lastPing: (await this.lastPingCell(id).getText()).trim(),
        };
    }

    /** Per-row status tally. */
    async statusTotals(): Promise<{ onRoute: number; charging: number; idle: number }> {
        const t = { onRoute: 0, charging: 0, idle: 0 };
        for (const r of await this.rows) {
            const s = this.norm(await r.$('[data-col="status"]').getText());
            if (s === 'on route') t.onRoute++;
            else if (s === 'charging') t.charging++;
            else if (s === 'idle') t.idle++;
        }
        return t;
    }

    /** Summary strip counts. */
    async summaryCounts(): Promise<{ onRoute: number; charging: number; idle: number }> {
        return {
            onRoute: parseInt(await this.onRouteCount.getText(), 10),
            charging: parseInt(await this.chargingCount.getText(), 10),
            idle: parseInt(await this.idleCount.getText(), 10),
        };
    }

    /** Freeze the live stream; resolves once the toggle reads "Paused". */
    async pauseLive(): Promise<void> {
        if ((await this.liveToggle.getText()).trim() === 'Live') await this.liveToggle.click();
        await browser.waitUntil(
            async () => (await this.liveToggle.getText()).trim() === 'Paused',
            { timeout: 5000, timeoutMsg: 'Live toggle did not switch to Paused' },
        );
    }
}

export default new FleetPage();
```

## House-rules checklist
- [x] Selectors only in the page object; `data-testid` first, then stable `id`/`data-col`, then positional CSS.
- [x] One journey per `describe`; ≥1 meaningful `expect` each; titles tagged + case ID.
- [x] No fixed sleeps — `waitForDisplayed` / `waitUntil` polling (FLEET-002 timeout 10 s, interval 500 ms).
- [x] No test data / fixtures (read-only). `window.__meridian` cross-check only; assertions DOM-based.
- [x] Nothing created, edited or deleted. Only BASE_URL touched.
- [x] If summary ≠ rows when paused → `it.skip` + `// BUG?`, never weaken the assertion.
