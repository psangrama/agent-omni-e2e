# Intake (New Order) — TC-INTK-001..012

- **App:** Meridian Ops Console — `BASE_URL` (test/staging only), hash route `#intake`.
- **Engine:** WebdriverIO (`TEST_ENGINE=wdio`). Spec: `test/wdio/specs/intake.e2e.ts`. Page object: `test/wdio/pageobjects/intake.page.ts` (exists — **extend**, see additions below).
- **Verified live:** 2026-11-11 against `BASE_URL` via browser MCP (read-only DOM inspection + driving the form). All 12 cases reproduced exactly as the catalog/fixtures describe. No app bug found — TC-INTK-012 validates consistently, so **no `it.skip`** is needed.
- **State model:** in-memory, reseeded on every full page reload. The intake form appends a row to the Orders grid and **auto-navigates to `#orders`** on a successful submit. A read-only snapshot lives at `window.__meridian.orders` (cross-check only; assert on the DOM except where noted for the requested-date default, which is not surfaced in any UI).
- **Live note:** Live defaults ON and the grid auto-appends orders. Intake cases assert on the intake form itself or on the **specific** QA-AUTO row (by unique customer), never on a raw orders total, so the live drift does not matter.

## Data
- Fixture: `test/fixtures/intake.json`, loaded with `loadFixture('intake', '<CASE-ID>')`. Unique values `{{unique.id}}` / `{{unique.email}}` are resolved per run; created customers carry the `QA-AUTO-` prefix.
- Helpers: `test/helpers/data/orders.ts` → `setupQaAutoOrder` / `cleanupQaAutoOrder` (`cleanupQaAutoOrder(app)` reloads → reseed drops the QA-AUTO order).
- **Only TC-INTK-002 and TC-INTK-010 create a record.** Each cleans up in `after` via `cleanupQaAutoOrder(app)` (full reload reseeds). 003/004/005/012 are blocked by validation (nothing created). 006/007/008/009/011 assert on the form without a successful submit (nothing created). No pre-existing record is edited, advanced, or deleted.

## Selectors — all `data-testid`, confirmed present in the live DOM
| Purpose | Selector | Notes |
| --- | --- | --- |
| Intake view section | `[data-testid="view-intake"]` | `waitForLoaded` target |
| Form | `[data-testid="intake-form"]` | `<form novalidate>` — app does its own validation |
| Customer name | `[data-testid="field-customer"]` | text; required |
| Customer error | `[data-testid="err-customer"]` | **new in PO**; "Customer name is required." |
| Contact email | `[data-testid="field-email"]` | email; required |
| Email error | `[data-testid="err-email"]` | **new**; "Email is required." / "Enter a valid email address." |
| Destination city | `[data-testid="field-destination"]` | text; required |
| Destination error | `[data-testid="err-destination"]` | **new**; "Destination is required." |
| Item count | `[data-testid="field-items"]` | number, `min=1 max=500 step=1`; required |
| Item-count error | `[data-testid="err-items"]` | **new**; "Item count is required." / "Enter 1–500 items." |
| Order amount | `[data-testid="field-amount"]` | number, `min=0 step=0.01`; required |
| Amount error | `[data-testid="err-amount"]` | **new**; "Amount is required." / "Amount must be 0 or more." |
| Requested date | `[data-testid="field-date"]` | **new**; `type=date`, optional, empty on load |
| Service level | `[data-testid="field-service"]` | `<select>` values Standard (default) / Express / Overnight / Freight |
| Priority group | `[data-testid="field-priority"]` | `role=radiogroup` `<div>`; radios `input[value="Low|Medium|High"]`, **Medium `checked` by default** |
| Total weight slider | `[data-testid="field-weight"]` | `type=range`, `min=0 max=200 step=5`, default `25` |
| Weight readout | `[data-testid="weight-output"]` | **new**; `<output>` mirrors the slider value |
| Delivery notes | `[data-testid="field-notes"]` | textarea; optional |
| Confirm checkbox | `[data-testid="field-terms"]` | required; "I confirm the shipping details are correct *" |
| Confirm error | `[data-testid="err-terms"]` | **new**; "Please confirm the details." |
| Create order | `[data-testid="intake-submit"]` | `type=submit` |
| Clear form | `[data-testid="intake-reset"]` | **new**; `type=reset`; a real (trusted) click resets fields **and** clears errors/summary and re-syncs the readout |
| Form summary | `[data-testid="form-summary"]` | **new**; `<span>`; "N field(s) need attention." on invalid submit, empty otherwise |

Only fields **without** an error span: `field-date`, `field-service`, `field-priority`, `field-weight`, `field-notes` (the six required fields plus terms each have one — hence the "6 field(s)" empty-submit summary).

## Page-object additions — `test/wdio/pageobjects/intake.page.ts`
Existing getters/`createOrder()` stay. Add (selectors live only here):
- Getters: `clearBtn` `$('[data-testid="intake-reset"]')`, `summary` `$('[data-testid="form-summary"]')`, `weightOutput` `$('[data-testid="weight-output"]')`, `date` `$('[data-testid="field-date"]')`.
- `error(field: string)` → `$('[data-testid="err-' + field + '"]')` (field ∈ customer/email/destination/items/amount/terms) — per-field error reader.
- `checkedPriority()` → `this.priorityGroup.$('input:checked').getAttribute('value')` — returns the selected radio value.
- `selectService(text)` → `this.service.selectByVisibleText(text)`.
- `selectPriority(value)` → `this.priorityRadio(value).click()` (uses existing `priorityRadio`).
- `setWeight(n)` → set the slider deterministically and fire `input` so the readout updates, keeping the selector in the PO, e.g. `browser.execute((v) => { const el = document.querySelector('[data-testid="field-weight"]'); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, n);` (range `setValue` is unreliable; the alternative is `this.weight.click()` then `ArrowRight`/`ArrowLeft` keys by `(n-25)/5` steps).
- `submit()` → `this.submitBtn.click()` **without** waiting for navigation (for negative/validation cases). Keep `createOrder()` for the happy path (it already waits for `#orders`).
- `fill(order)` → fill only the provided fields and check `field-terms` only when `order.confirm === true` (a non-submitting variant of `createOrder`'s body, reused by 003/004/005/012).
- `clearForm()` → `this.clearBtn.click()`.
- `summaryText()` / `errorText(field)` are read in the spec via `expect(IntakePage.summary).toHaveText(...)`.

`describe` titles (tag + case ID, house rules): `describe('Intake @smoke TC-INTK-001', …)`, `…@smoke TC-INTK-002`, `…@regression TC-INTK-003` … `TC-INTK-012`. No `browser.pause()` — use `waitForDisplayed` / `waitUntil` / web-first `expect`.

---

## TC-INTK-001 — New Order form loads with all fields  `@smoke`
Preconditions: `#intake` open fresh.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open intake | `IntakePage.open()` → `#intake` | View + form render | `await expect(IntakePage.view).toBeDisplayed()`; `await expect(IntakePage.form).toBeDisplayed()` |
| 2 | All inputs present | each `field-*` getter | Every field displayed | `for (const f of [IntakePage.customer, IntakePage.email, IntakePage.destination, IntakePage.items, IntakePage.amount, IntakePage.service, IntakePage.priorityGroup, IntakePage.weight, IntakePage.notes, IntakePage.terms]) await expect(f).toBeDisplayed()` |
| 3 | Both buttons present | `intake-submit`, `intake-reset` | "Create order" / "Clear form" shown | `await expect(IntakePage.submitBtn).toHaveText('Create order')`; `await expect(IntakePage.clearBtn).toHaveText('Clear form')` |

Meaningful assertion: all 10 fields plus the Create/Clear buttons are displayed (steps 2–3).

---

## TC-INTK-002 — Create a valid order (happy path)  `@smoke`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-002')` → QA-AUTO customer + unique email, Testburg, 3 items, $250, Standard/Medium, confirm true. `after`: `await cleanupQaAutoOrder(app)` (reload reseeds, drops the order).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Build order from fixture | factory | `customerName` = `QA-AUTO-<unique>` | `const order = buildQaAutoOrder('TC-INTK-002')` (or load via fixture) |
| 2 | Fill + submit | `IntakePage.createOrder(order)` | Form submits, app navigates | `await IntakePage.createOrder(order)` (waits for `#orders`) |
| 3 | Assert navigation | `browser.getUrl()` | Hash is `#orders` | `await expect(browser).toHaveUrl(expect.stringContaining('#orders'))` |
| 4 | New row appended | Orders grid search by unique customer | Exactly the QA-AUTO row appears | `await OrdersPage.pauseLive(); await OrdersPage.search(order.customerName); await browser.waitUntil(async () => (await OrdersPage.rows.length) >= 1, { timeoutMsg: 'created order not found' })` |
| 5 | Row matches | first row customer cell | Customer = `order.customerName` | `await expect(OrdersPage.customerCell(OrdersPage.rowAt(0))).toHaveText(order.customerName)` |

Meaningful assertion: app navigates to `#orders` **and** the appended row carries the exact unique QA-AUTO customer (steps 3–5). Live-verified: orders length 47→48; created order `{priority: 'Medium', status: 'Queued'}`.

---

## TC-INTK-003 — Submit empty form shows required errors  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-003')` → `expectedSummary` + `expectedErrors[6]`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open intake | `IntakePage.open()` | Form empty | `await expect(IntakePage.form).toBeDisplayed()` |
| 2 | Submit empty | `[data-testid="intake-submit"]` | Stays on intake, errors render | `await IntakePage.submit()`; `await expect(browser).toHaveUrl(expect.stringContaining('#intake'))` |
| 3 | Six field errors | `err-customer/email/destination/items/amount/terms` | Exact catalog messages | `await expect(IntakePage.error('customer')).toHaveText('Customer name is required.')`; `…('email') 'Email is required.'`; `…('destination') 'Destination is required.'`; `…('items') 'Item count is required.'`; `…('amount') 'Amount is required.'`; `…('terms') 'Please confirm the details.'` |
| 4 | Summary | `[data-testid="form-summary"]` | "6 field(s) need attention." | `await expect(IntakePage.summary).toHaveText(data.expectedSummary)` |

Meaningful assertion: all six required messages plus the "6 field(s) need attention." summary (steps 3–4). No order created (stays on `#intake`).

---

## TC-INTK-004 — Invalid email format is rejected  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-004')` → required fields valid, `contactEmail='not-an-email'`, confirm true, `expectedMessage`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open + fill | `IntakePage.fill(data)` | All required filled, email = "not-an-email" | `await IntakePage.fill(data)` |
| 2 | Submit | `[data-testid="intake-submit"]` | Blocked, stays on intake | `await IntakePage.submit()`; `await expect(browser).toHaveUrl(expect.stringContaining('#intake'))` |
| 3 | Email error | `[data-testid="err-email"]` | "Enter a valid email address." | `await expect(IntakePage.error('email')).toHaveText(data.expectedMessage)` |
| 4 | Summary present | `[data-testid="form-summary"]` | "1 field(s) need attention." | `await expect(IntakePage.summary).toHaveText('1 field(s) need attention.')` |

Meaningful assertion: email field shows "Enter a valid email address." and submit is blocked (steps 2–3). (Live-verified: only the email error fires → summary "1 field(s) need attention.")

---

## TC-INTK-005 — Missing confirm checkbox blocks submit  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-005')` → required fields valid, `confirm=false`, `expectedMessage`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open + fill (leave confirm off) | `IntakePage.fill(data)` | Terms unchecked | `await IntakePage.fill(data)`; `await expect(IntakePage.terms).not.toBeSelected()` |
| 2 | Submit | `[data-testid="intake-submit"]` | Blocked, stays on intake | `await IntakePage.submit()`; `await expect(browser).toHaveUrl(expect.stringContaining('#intake'))` |
| 3 | Terms error | `[data-testid="err-terms"]` | "Please confirm the details." | `await expect(IntakePage.error('terms')).toHaveText(data.expectedMessage)` |

Meaningful assertion: terms error shown and order not created (steps 2–3). (Live-verified: summary "1 field(s) need attention.")

---

## TC-INTK-006 — Express service sets High priority  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-006')` → `expectedPriority='High'`. (No submit → nothing created.)

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open intake | `IntakePage.open()` | Default priority Medium | `await expect(IntakePage.priorityRadio('Medium')).toBeSelected()` |
| 2 | Select Express | `[data-testid="field-service"]` | Priority driven to High | `await IntakePage.selectService('Express')` |
| 3 | High radio checked | `field-priority input[value="High"]` | High becomes selected | `await expect(IntakePage.priorityRadio('High')).toBeSelected()` |

Meaningful assertion: choosing Express selects the High priority radio in the DOM (step 3). Live-verified: `checked` flips to High immediately on `change`. (Alternative if a submit is wanted: create the order and assert the grid row's Priority cell = High, then clean up — not needed here.)

---

## TC-INTK-007 — Overnight service sets High priority  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-007')` → `expectedPriority='High'`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open intake | `IntakePage.open()` | Default Medium | `await expect(IntakePage.priorityRadio('Medium')).toBeSelected()` |
| 2 | Select Overnight | `[data-testid="field-service"]` | Priority driven to High | `await IntakePage.selectService('Overnight')` |
| 3 | High radio checked | `field-priority input[value="High"]` | High selected | `await expect(IntakePage.priorityRadio('High')).toBeSelected()` |

Meaningful assertion: Overnight selects the High priority radio (step 3). Live-verified.

---

## TC-INTK-008 — Priority radios selectable  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-008')` → `priorityFirst='Low'`, `prioritySecond='High'`, `defaultPriority='Medium'`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open intake | `IntakePage.open()` | Default Medium checked | `await expect(IntakePage.priorityRadio(data.defaultPriority)).toBeSelected()` |
| 2 | Select Low | `field-priority input[value="Low"]` | Low becomes checked | `await IntakePage.selectPriority(data.priorityFirst)`; `await expect(IntakePage.priorityRadio('Low')).toBeSelected()` |
| 3 | Select High | `field-priority input[value="High"]` | High becomes checked, Low unchecked | `await IntakePage.selectPriority(data.prioritySecond)`; `await expect(IntakePage.priorityRadio('High')).toBeSelected()`; `await expect(IntakePage.priorityRadio('Low')).not.toBeSelected()` |

Meaningful assertion: default Medium, then the chosen radio (Low, then High) is exclusively selected (steps 1–3). Live-verified.

---

## TC-INTK-009 — Weight slider updates readout  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-009')` → `totalWeight=60`, `defaultWeight=25`.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open intake | `IntakePage.open()` | Default readout 25 | `await expect(IntakePage.weightOutput).toHaveText(String(data.defaultWeight))` |
| 2 | Move slider to 60 | `[data-testid="field-weight"]` | Slider = 60 | `await IntakePage.setWeight(data.totalWeight)` |
| 3 | Readout reflects value | `[data-testid="weight-output"]` | Reads "60" | `await expect(IntakePage.weightOutput).toHaveText(String(data.totalWeight))`; `await expect(IntakePage.weight).toHaveValue(String(data.totalWeight))` |

Meaningful assertion: the `<output>` readout changes from 25 to 60 to match the slider (steps 1–3). Live-verified (`step=5`, 60 is a valid stop).

---

## TC-INTK-010 — Requested date defaults to today  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-010')` → required fields, **no** `requestedDate`, confirm true. `after`: `cleanupQaAutoOrder(app)`.
Note: the Requested-date field is empty on load and **no date is surfaced** in the Orders grid or the details dialog, so the "today" value can only be read from the `window.__meridian` snapshot (`created` epoch). Primary assertion is on the DOM (order created with date left blank); the today check is a snapshot cross-check.

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Date empty on load | `[data-testid="field-date"]` | Optional field blank | `await expect(IntakePage.date).toHaveValue('')` |
| 2 | Fill (no date) + submit | `IntakePage.createOrder(order)` | Submits despite empty date | `await IntakePage.createOrder(order)` (date untouched) |
| 3 | Order created | `browser.getUrl()` + grid | Navigates to `#orders`; QA-AUTO row present | `await expect(browser).toHaveUrl(expect.stringContaining('#orders'))`; `await OrdersPage.pauseLive(); await OrdersPage.search(order.customerName); await expect(OrdersPage.customerCell(OrdersPage.rowAt(0))).toHaveText(order.customerName)` |
| 4 | Date defaulted to today (cross-check) | `window.__meridian.orders` | Created order's date = today | `const ts = await browser.execute((c) => { const o = window.__meridian.orders.find(x => x.customer === c); return o && o.created; }, order.customerName); expect(new Date(ts).toDateString()).toBe(new Date().toDateString())` |

Meaningful assertion: leaving Requested date blank still creates the order (optional field) — step 3 — and the created order's timestamp falls on today (step 4). Note for the healer: step 4 reads the snapshot because no requested-date is rendered anywhere in the UI.

---

## TC-INTK-011 — Clear form resets all fields  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-011')` → full set (Express, High, weight 70, notes, confirm true).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open + fill all | `IntakePage.fill(data)` + `setWeight(70)` | Fields populated | `await IntakePage.fill(data); await IntakePage.setWeight(data.totalWeight)` |
| 2 | Submit invalid then OK? Produce an error first | `IntakePage.submit()` with a bad email OR skip | Optional: have at least one error on screen before clearing | (Optional) set email invalid and `submit()` so an error + summary are visible to prove they clear |
| 3 | Click Clear form | `[data-testid="intake-reset"]` | All inputs reset to defaults; errors + summary cleared | `await IntakePage.clearForm()` |
| 4 | Text fields empty | customer/email/destination/items/amount/notes | All empty | `for (const f of [IntakePage.customer, IntakePage.email, IntakePage.destination, IntakePage.items, IntakePage.amount, IntakePage.notes]) await expect(f).toHaveValue('')` |
| 5 | Defaults restored | service / priority / weight / terms | Standard, Medium, 25, unchecked | `await expect(IntakePage.service).toHaveValue('Standard')`; `await expect(IntakePage.priorityRadio('Medium')).toBeSelected()`; `await expect(IntakePage.weight).toHaveValue('25')`; `await expect(IntakePage.weightOutput).toHaveText('25')`; `await expect(IntakePage.terms).not.toBeSelected()` |
| 6 | Errors + summary cleared | any `err-*`, `form-summary` | Empty | `await expect(IntakePage.error('email')).toHaveText('')`; `await expect(IntakePage.summary).toHaveText('')` |

Meaningful assertion: every field returns to its default **and** errors/summary clear (steps 4–6). Live-verified with a **trusted** click (WDIO clicks are trusted): the readout re-syncs to 25 and the summary/errors empty. (A programmatic `.click()` does not fire the app's reset handler — irrelevant to WDIO, noted so the healer does not "fix" a non-issue.)

---

## TC-INTK-012 — Item count / amount boundary (0 or negative)  `@regression`
Preconditions: `#intake` open fresh. Data: `loadFixture('intake','TC-INTK-012')` → `.zero` and `.negative` variants.
**Observed behaviour (consistent validation — NOT a bug, so a real assertion, no `it.skip`):**
- `field-items` has `min=1`: **0 and negative are rejected** → "Enter 1–500 items."
- `field-amount` has `min=0`: **negative is rejected** → "Amount must be 0 or more."; **0 is accepted** (no error).
- Neither variant creates an order (stays on `#intake`).

| # | Action | Element / selector | Expected result | Assertion (WDIO) |
| --- | --- | --- | --- | --- |
| 1 | Open + fill zero variant | `IntakePage.fill(data.zero)` (items 0, amount 0) | Values entered | `await IntakePage.fill(data.zero)` |
| 2 | Submit | `[data-testid="intake-submit"]` | Blocked on items; stays on intake | `await IntakePage.submit()`; `await expect(browser).toHaveUrl(expect.stringContaining('#intake'))` |
| 3 | Items rejected, amount OK | `err-items`, `err-amount` | items error shown; amount error empty (0 allowed) | `await expect(IntakePage.error('items')).toHaveText('Enter 1–500 items.')`; `await expect(IntakePage.error('amount')).toHaveText('')` |
| 4 | Summary | `[data-testid="form-summary"]` | "1 field(s) need attention." | `await expect(IntakePage.summary).toHaveText('1 field(s) need attention.')` |
| 5 | Clear + fill negative variant | `clearForm()` then `fill(data.negative)` (items -3, amount -10) | Values entered | `await IntakePage.clearForm(); await IntakePage.fill(data.negative)` |
| 6 | Submit | `[data-testid="intake-submit"]` | Blocked; stays on intake | `await IntakePage.submit()`; `await expect(browser).toHaveUrl(expect.stringContaining('#intake'))` |
| 7 | Both errors | `err-items`, `err-amount` | items + amount errors shown | `await expect(IntakePage.error('items')).toHaveText('Enter 1–500 items.')`; `await expect(IntakePage.error('amount')).toHaveText('Amount must be 0 or more.')` |
| 8 | Summary | `[data-testid="form-summary"]` | "2 field(s) need attention." | `await expect(IntakePage.summary).toHaveText('2 field(s) need attention.')` |

Meaningful assertion: non-positive numerics are validated consistently — items reject 0 and negatives, amount rejects negatives but accepts 0, and no order is created (steps 3–8). Live-verified both variants.

---

## Notes for the generator / healer
- Selectors live **only** in `intake.page.ts`; the spec references them through getters/methods. The orders-grid checks in 002/010 reuse the existing `OrdersPage` (`pauseLive`, `search`, `rowAt`, `customerCell`).
- No fixed sleeps anywhere — use `waitForDisplayed` / `waitUntil` / web-first `expect` (navigation waits already live in `createOrder`).
- `setWeight` must fire an `input` event (range `setValue` is unreliable); keep that selector inside the PO (`browser.execute` with the `field-weight` testid, or arrow-key stepping).
- Residue: only 002 and 010 submit a `QA-AUTO-` order; both reload in `after`, and the app has no backend, so a reseed removes them. Verified: no QA-AUTO residue persists after a reload.
