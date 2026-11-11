# Orders — TC-ORD-001..012

- **App:** Meridian Ops Console — `BASE_URL` (test/staging only), hash route `#orders`.
- **Engine:** WebdriverIO (`TEST_ENGINE=wdio`). Spec: `test/wdio/specs/orders.e2e.ts`. Page object: `test/wdio/pageobjects/orders.page.ts` (new).
- **Verified live:** 2026-11-11 against `BASE_URL` via browser MCP (read-only DOM inspection). All 12 cases confirmed as written.
- **State model:** in-memory, reseeded on every full page reload. **Live defaults ON**, and while Live is on the app keeps appending new orders to the grid (observed count drift 35 → 42 → 46 within a couple of minutes). Read-only snapshot at `window.__meridian` (cross-check only; assert on the DOM).

## CRITICAL precondition — pause Live on every grid case
Because the live stream appends orders, the result-count total and page totals drift mid-test. **Each `it` opens `#orders` fresh (reseed) and immediately calls `OrdersPage.pauseLive()`** so the dataset is frozen for the duration of the case. Assertions therefore avoid fragile exact totals and instead assert:
- per-row properties (every visible row matches the active filter/search),
- the count-label **format** (`/^\d+ orders match$/`) and relative behaviour (updates vs. full count),
- `aria-sort` direction and monotonic ordering of a visible column,
- page-info text prefix and Prev/Next disabled state.

## Data
- Fixture: `test/fixtures/orders.json`, loaded with `loadFixture('orders', '<CASE-ID>')`.
- Helpers: `test/helpers/data/orders.ts` → `buildQaAutoOrder` / `setupQaAutoOrder` / `cleanupQaAutoOrder`.
- **TC-ORD-002 only** needs a seeded record: in `before`, `setupQaAutoOrder(intakePage)` creates a `QA-AUTO-<unique>` order via the intake form (fixture `TC-ODTL-003`); in `after`, `cleanupQaAutoOrder(app)` reloads → reseed removes it. No other case creates records. No pre-existing record is edited, advanced, or deleted.

## Selectors (all `data-testid`, confirmed present in the live DOM)

| Purpose | Selector | Notes |
| --- | --- | --- |
| Orders view section | `[data-testid="view-orders"]` | wrapper; `waitForLoaded` target |
| "+ New order" button | `[data-testid="orders-new"]` | navigates to `#intake` |
| Search box | `[data-testid="order-search"]` | text input; matches id / customer / destination |
| Status filter | `[data-testid="order-status-filter"]` | `<select>`; option **values** = "", "Queued", "In Transit", "Delivered", "Delayed" ("All statuses" = "") |
| Priority filter | `[data-testid="order-priority-filter"]` | `<select>`; option values "", "High", "Medium", "Low" |
| Reset button | `[data-testid="order-filter-reset"]` | clears search + both filters |
| Match-count label | `[data-testid="order-match-count"]` | text "N orders match" |
| Table | `[data-testid="orders-table"]` | 1 checkbox col + Order/Customer/Destination/Items/Amount/Priority/Status |
| Column header (sortable) | `[data-testid="orders-table"] thead th` | `<th role=columnheader aria-sort="none\|ascending\|descending">`; **no testid** — select by contained text |
| Select-all checkbox | `[data-testid="order-select-all"]` | header `<input type=checkbox>` |
| Table body | `[data-testid="orders-body"]` | shows "No orders match the current filters." when empty |
| Order rows | `[data-testid="order-row"]` | `$$` array; each has `data-id="ORD-xxxx"`; gets class `selected` when ticked |
| Row cells | `[data-testid="order-row"] td:nth-child(n)` | 1 checkbox, 2 Order, 3 Customer, 4 Destination, 5 Items, **6 Amount**, **7 Priority**, **8 Status** |
| Row select checkbox | `[data-testid="order-row"] input[type=checkbox]` | aria-label "Select ORD-xxxx" |
| Page-info label | `[data-testid="order-page-info"]` | text "Showing A–B of N" |
| Rows-per-page select | `[data-testid="order-page-size"]` | options 5, 8 (default), 15, 25 |
| Prev button | `[data-testid="order-page-prev"]` | `disabled` on page 1 |
| Next button | `[data-testid="order-page-next"]` | `disabled` on last page |
| Live/Paused toggle (header) | `[data-testid="live-toggle"]` | text "Live"/"Paused"; reused to freeze the grid |

For TC-ORD-002 seeding, the intake page object supplies `createOrder()` over these fields (already present in the DOM): `field-customer`, `field-email`, `field-destination`, `field-items`, `field-amount`, `field-service`, `field-priority`, `field-weight`, `field-notes`, `field-terms`, `intake-submit`.

---

## TC-ORD-001 — Orders grid loads with rows and headers  `@smoke`
Preconditions: `#orders` open fresh, Live paused.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders | `OrdersPage.open()` → `#orders` | View renders | `await expect(OrdersPage.view).toBeDisplayed()` |
| 2 | Pause Live | `[data-testid="live-toggle"]` | Grid frozen | `await OrdersPage.pauseLive()` |
| 3 | Check column headers | `thead th` texts | Order, Customer, Destination, Items, Amount, Priority, Status present | `await expect(OrdersPage.headerTexts()).resolves.toEqual(expect.arrayContaining(['Order','Customer','Destination','Items','Amount','Priority','Status']))` |
| 4 | Check ≥1 row | `[data-testid="order-row"]` | At least one data row | `await browser.waitUntil(async () => (await OrdersPage.rows.length) >= 1, {...})` |
| 5 | Check count label | `[data-testid="order-match-count"]` | "N orders match" shown | `await expect(OrdersPage.matchCount).toHaveText(/^\d+ orders match$/)` |

Meaningful assertion: the 7 business columns are present (step 3) and ≥1 row with a well-formed count label (steps 4–5).

---

## TC-ORD-002 — Search filters rows by text  `@regression`
Preconditions: `#orders` open fresh. `before`: `const seeded = await setupQaAutoOrder(intakePage)` (creates `QA-AUTO-<id>`). `after`: `await cleanupQaAutoOrder(app)` (reload reseeds, drops the QA-AUTO order). Data: `loadFixture('orders','TC-ORD-002')` → `{ searchTerm: 'QA-AUTO', minMatches: 1 }`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen with seeded order present | `await OrdersPage.pauseLive()` |
| 2 | Type search term | `[data-testid="order-search"]` | Grid filters to matches | `await OrdersPage.search(data.searchTerm)` |
| 3 | At least `minMatches` rows | `[data-testid="order-row"]` | ≥1 matching row shown | `await browser.waitUntil(async () => (await OrdersPage.rows.length) >= data.minMatches, { timeoutMsg: 'search returned no rows' })` |
| 4 | Every shown row matches | each `order-row` text | Each visible row contains "QA-AUTO" | `for (const r of await OrdersPage.rows) await expect(r).toHaveText(expect.stringContaining(data.searchTerm))` |
| 5 | Count label updates | `[data-testid="order-match-count"]` | Reads "N orders match", N ≥ 1 | `await expect(OrdersPage.matchCount).toHaveText(/^\d+ orders match$/)` |

Meaningful assertion: every displayed row contains the search token (step 4) — count-agnostic, per the fixture note.

---

## TC-ORD-003 — Search with no match shows zero results  `@regression`
Preconditions: `#orders` open fresh, Live paused. Data: `{ searchTerm: 'ZZZZ', expectedCount: 0, expectedLabel: '0 orders match' }`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Search "ZZZZ" | `[data-testid="order-search"]` | No rows match | `await OrdersPage.search(data.searchTerm)` |
| 3 | Zero rows | `[data-testid="order-row"]` | Empty grid body | `await expect(OrdersPage.rows).toBeElementsArrayOfSize(0)` |
| 4 | Empty-state text | `[data-testid="orders-body"]` | "No orders match the current filters." | `await expect(OrdersPage.body).toHaveText('No orders match the current filters.')` |
| 5 | Count label | `[data-testid="order-match-count"]` | "0 orders match" | `await expect(OrdersPage.matchCount).toHaveText(data.expectedLabel)` |

Meaningful assertion: 0 rows + explicit empty-state text + "0 orders match" (steps 3–5).

---

## TC-ORD-004 — Filter by status  `@regression`
Preconditions: `#orders` open fresh, Live paused. Data: `{ status: 'In Transit' }`. (Live: 17 matched.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Select status | `[data-testid="order-status-filter"]` | Grid filters to In Transit | `await OrdersPage.filterStatus(data.status)` (`selectByVisibleText`) |
| 3 | Rows present | `[data-testid="order-row"]` | ≥1 row | `await browser.waitUntil(async () => (await OrdersPage.rows.length) >= 1, {...})` |
| 4 | Every row status matches | cell `td:nth-child(8)` | All visible rows status = "In Transit" | `for (const r of await OrdersPage.rows) await expect(OrdersPage.statusCell(r)).toHaveText(data.status)` |
| 5 | Count updates | `[data-testid="order-match-count"]` | Well-formed count label | `await expect(OrdersPage.matchCount).toHaveText(/^\d+ orders match$/)` |

Meaningful assertion: every visible row's Status cell equals "In Transit" (step 4).

---

## TC-ORD-005 — Filter by priority  `@regression`
Preconditions: `#orders` open fresh, Live paused. Data: `{ priority: 'High' }`. (Live: 18 matched, all High.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Select priority | `[data-testid="order-priority-filter"]` | Grid filters to High | `await OrdersPage.filterPriority(data.priority)` |
| 3 | Rows present | `[data-testid="order-row"]` | ≥1 row | `waitUntil rows.length >= 1` |
| 4 | Every row priority matches | cell `td:nth-child(7)` | All visible rows priority = "High" | `for (const r of await OrdersPage.rows) await expect(OrdersPage.priorityCell(r)).toHaveText(data.priority)` |
| 5 | Count updates | `[data-testid="order-match-count"]` | Well-formed count label | `await expect(OrdersPage.matchCount).toHaveText(/^\d+ orders match$/)` |

Meaningful assertion: every visible row's Priority cell equals "High" (step 4).

---

## TC-ORD-006 — Combined status + priority filter  `@regression`
Preconditions: `#orders` open fresh, Live paused. Data: `{ status: 'Delivered', priority: 'Low' }`. (Live: 5 matched, all Delivered + Low.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Select status + priority | status + priority filters | Grid filters to both | `await OrdersPage.filterStatus(data.status); await OrdersPage.filterPriority(data.priority)` |
| 3 | Rows present | `[data-testid="order-row"]` | ≥1 row satisfying both | `waitUntil rows.length >= 1` |
| 4 | Every row matches both | cells 7 & 8 | Status = Delivered AND Priority = Low | `for (const r of await OrdersPage.rows) { await expect(OrdersPage.statusCell(r)).toHaveText(data.status); await expect(OrdersPage.priorityCell(r)).toHaveText(data.priority); }` |

Meaningful assertion: every visible row matches both filters (step 4).

---

## TC-ORD-007 — Reset clears search and filters  `@regression`
Preconditions: `#orders` open fresh, Live paused.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Apply search + filters | search + both filters | Grid narrowed | `await OrdersPage.search('Adventure'); await OrdersPage.filterStatus('Delivered'); await OrdersPage.filterPriority('Low')`; capture `const narrowed = await OrdersPage.rows.length` |
| 3 | Click Reset | `[data-testid="order-filter-reset"]` | Search cleared, filters back to "All…" | `await OrdersPage.reset()` |
| 4 | Search empty | `[data-testid="order-search"]` | Value empty | `await expect(OrdersPage.search_).toHaveValue('')` |
| 5 | Filters reset | status/priority selects | Both show "All …" (value "") | `await expect(OrdersPage.statusFilter).toHaveValue(''); await expect(OrdersPage.priorityFilter).toHaveValue('')` |
| 6 | Full set restored | `[data-testid="order-row"]` | Row count ≥ narrowed (full grid back) | `await expect(await OrdersPage.rows.length).toBeGreaterThanOrEqual(narrowed)` |

Meaningful assertion: search empty + both filters back to "" and grid widened (steps 4–6).

---

## TC-ORD-008 — Sort by Amount ascending/descending  `@regression`
Preconditions: `#orders` open fresh, Live paused. Data: `{ sortColumn: 'Amount' }`. (Live: asc `aria-sort="ascending"` + values 95.10→506.45; second click `descending` + 4213.07→…)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Click Amount header | `thead th` containing "Amount" | Sorts ascending | `await OrdersPage.sortBy(data.sortColumn)` |
| 3 | Assert asc indicator | header `aria-sort` | `aria-sort="ascending"` | `await expect(OrdersPage.header(data.sortColumn)).toHaveAttribute('aria-sort','ascending')` |
| 4 | Assert values ascending | Amount cells | Visible amounts non-decreasing | `const a = await OrdersPage.amountValues(); expect(a).toEqual([...a].sort((x,y)=>x-y))` |
| 5 | Click Amount header again | same header | Sorts descending | `await OrdersPage.sortBy(data.sortColumn)` |
| 6 | Assert desc indicator | header `aria-sort` | `aria-sort="descending"` | `await expect(OrdersPage.header(data.sortColumn)).toHaveAttribute('aria-sort','descending')` |
| 7 | Assert values descending | Amount cells | Visible amounts non-increasing | `const d = await OrdersPage.amountValues(); expect(d).toEqual([...d].sort((x,y)=>y-x))` |

Meaningful assertion: `aria-sort` toggles ascending→descending and the visible Amount values are ordered to match (steps 3–7).

---

## TC-ORD-009 — Change rows per page to 15  `@regression`
Preconditions: `#orders` open fresh, Live paused. Data: `{ rowsPerPage: 15 }`. (Seed ≥ 35 ⇒ ≥15 rows exist.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Select 15 rows | `[data-testid="order-page-size"]` | Page size 15 | `await OrdersPage.setRowsPerPage(data.rowsPerPage)` (`selectByVisibleText('15')`) |
| 3 | Up to 15 rows shown | `[data-testid="order-row"]` | Exactly 15 rows (N ≥ 15) | `await expect(OrdersPage.rows).toBeElementsArrayOfSize(15)` |
| 4 | Page info updates | `[data-testid="order-page-info"]` | "Showing 1–15 of N" | `await expect(OrdersPage.pageInfo).toHaveText(/^Showing 1–15 of \d+$/)` |

Meaningful assertion: 15 rows render and page-info reads "Showing 1–15 of N" (steps 3–4).

---

## TC-ORD-010 — Paginate with Next / Prev  `@regression`
Preconditions: `#orders` open fresh, Live paused; default page size 8, >1 page (seed ≥ 35). (Live: page1 "Showing 1–8 of N", Prev disabled; Next → "Showing 9–16 of N", Prev enabled; Prev → back to page 1.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Assert page 1 state | `order-page-info`, `order-page-prev` | "Showing 1–8 of N"; Prev disabled | `await expect(OrdersPage.pageInfo).toHaveText(/^Showing 1–8 of \d+$/)`; `await expect(OrdersPage.prevBtn).toBeDisabled()` |
| 3 | Capture page-1 first id | first `order-row` `data-id` | e.g. ORD-xxxx | `const id1 = await OrdersPage.firstRowId()` |
| 4 | Click Next | `[data-testid="order-page-next"]` | Advances to page 2 | `await OrdersPage.nextPage()` |
| 5 | Assert page 2 | page-info / prev / first id | "Showing 9–16 of N"; Prev enabled; first id ≠ id1 | `await expect(OrdersPage.pageInfo).toHaveText(/^Showing 9–16 of \d+$/)`; `await expect(OrdersPage.prevBtn).toBeEnabled()`; `expect(await OrdersPage.firstRowId()).not.toBe(id1)` |
| 6 | Click Prev | `[data-testid="order-page-prev"]` | Returns to page 1 | `await OrdersPage.prevPage()` |
| 7 | Assert back on page 1 | page-info / prev / first id | "Showing 1–8 of N"; Prev disabled again; first id = id1 | `await expect(OrdersPage.pageInfo).toHaveText(/^Showing 1–8 of \d+$/)`; `await expect(OrdersPage.prevBtn).toBeDisabled()`; `expect(await OrdersPage.firstRowId()).toBe(id1)` |

Meaningful assertion: page advances (first row changes, "9–16") then returns (first row restored); Prev disabled on page 1 (steps 5 & 7).

---

## TC-ORD-011 — Select a single row and select-all  `@regression`
Preconditions: `#orders` open fresh, Live paused. (Live: row click on its checkbox ticks it and adds class `selected`; select-all ticks all visible. Clicking the checkbox does not open the details dialog.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders, pause Live | view / `live-toggle` | Grid frozen | `await OrdersPage.pauseLive()` |
| 2 | Tick first row checkbox | `order-row` input[type=checkbox] (index 0) | Row becomes selected | `await OrdersPage.selectRow(0)` |
| 3 | Assert row selected | first row checkbox | Checkbox checked | `await expect(OrdersPage.rowCheckbox(0)).toBeSelected()` |
| 4 | Tick select-all | `[data-testid="order-select-all"]` | All visible rows selected | `await OrdersPage.selectAll()` |
| 5 | Assert all selected | every row checkbox | Every visible checkbox checked | `for (const c of await OrdersPage.rowCheckboxes) await expect(c).toBeSelected()`; `await expect(OrdersPage.selectAllBox).toBeSelected()` |

Meaningful assertion: single checkbox checked after step 2, then every visible row checkbox checked after select-all (steps 3 & 5). Assert via DOM checkbox state, not `window.__meridian.selected` (snapshot lags).

---

## TC-ORD-012 — "+ New order" opens the intake form  `@regression`
Preconditions: `#orders` open fresh (pause optional — no grid assertion).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open orders | `OrdersPage.open()` | Orders view shown | `await expect(OrdersPage.view).toBeDisplayed()` |
| 2 | Click "+ New order" | `[data-testid="orders-new"]` | Navigates to intake | `await OrdersPage.openNewOrder()` |
| 3 | Assert URL hash | `browser.getUrl()` | Hash is `#intake` | `await expect(browser).toHaveUrl(expect.stringContaining('#intake'))` |
| 4 | Assert intake view | `[data-testid="view-intake"]` / `[data-testid="intake-form"]` | New Order form renders | `await expect($('[data-testid="view-intake"]')).toBeDisplayed()` |

Meaningful assertion: hash becomes `#intake` and the intake view/form is displayed (steps 3–4). (`nav-intake` exposes no `aria-pressed`, so assert via hash + view, not nav state.)

---

## Page object sketch — `test/wdio/pageobjects/orders.page.ts`

Extends `Page`, `protected path = '/#orders'`, singleton export. Selectors as getters; actions named for intent; no assertions except `waitForLoaded`.

Getters:
- `view` `$('[data-testid="view-orders"]')`, `newOrderBtn` `$('[data-testid="orders-new"]')`
- `search_` `$('[data-testid="order-search"]')`, `statusFilter` `$('[data-testid="order-status-filter"]')`, `priorityFilter` `$('[data-testid="order-priority-filter"]')`, `resetBtn` `$('[data-testid="order-filter-reset"]')`, `matchCount` `$('[data-testid="order-match-count"]')`
- `table` `$('[data-testid="orders-table"]')`, `body` `$('[data-testid="orders-body"]')`, `rows` `$$('[data-testid="order-row"]')`, `selectAllBox` `$('[data-testid="order-select-all"]')`
- `rowCheckboxes` `$$('[data-testid="order-row"] input[type="checkbox"]')`
- `pageInfo` `$('[data-testid="order-page-info"]')`, `pageSize` `$('[data-testid="order-page-size"]')`, `prevBtn` `$('[data-testid="order-page-prev"]')`, `nextBtn` `$('[data-testid="order-page-next"]')`
- `liveToggle` `$('[data-testid="live-toggle"]')`
- `header(name)` → `this.table.$(`thead th*=${name}`)` (partial-text match; th carries the sort arrow glyph)
- `statusCell(row)` → `row.$('td:nth-child(8)')`, `priorityCell(row)` → `row.$('td:nth-child(7)')`, `amountCell(row)` → `row.$('td:nth-child(6)')`
- `rowCheckbox(i)` → `this.rows[i].$('input[type="checkbox"]')`

Actions:
- `open()` → `super.open('/#orders')`; `waitForLoaded()` waits `view` displayed.
- `pauseLive()` → if `liveToggle` text is "Live", click it; `waitUntil` text === "Paused" (freezes the grid).
- `search(term)` → `setValue` on `search_` (clears then types).
- `filterStatus(text)` / `filterPriority(text)` → `selectByVisibleText`.
- `reset()` → click `resetBtn`.
- `setRowsPerPage(n)` → `pageSize.selectByVisibleText(String(n))`.
- `sortBy(name)` → click `header(name)`.
- `nextPage()` / `prevPage()` → click `nextBtn` / `prevBtn`.
- `selectRow(i)` → click `rowCheckbox(i)`; `selectAll()` → click `selectAllBox`.
- `openNewOrder()` → click `newOrderBtn`; `waitUntil` URL contains `#intake`.
- `headerTexts()` → map `thead th` texts (trimmed, arrow stripped) for TC-ORD-001.
- `amountValues()` → map visible Amount cells to `parseFloat(text.replace(/[$,]/g,''))`.
- `firstRowId()` → `this.rows[0].getAttribute('data-id')`.

Spec `describe` titles (tag + case ID, per house rules):
- `describe('Orders @smoke TC-ORD-001', ...)`
- `describe('Orders @regression TC-ORD-002', ...)` … through `describe('Orders @regression TC-ORD-012', ...)`

No `browser.pause()` anywhere — use `waitForDisplayed` / `waitUntil`. Selectors live only in the page object. For TC-ORD-002, the spec injects the intake page object into `setupQaAutoOrder` and reloads in `after` via `cleanupQaAutoOrder`.
