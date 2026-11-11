# Order details dialog — test plan (TEST_ENGINE=wdio)

Feature: **order-details** — the modal dialog that opens over the Orders grid (`#orders`).
Meridian Ops Console is a hash-routed SPA with in-memory state that **reseeds on a full page
reload**. Order details open in a **modal dialog** (no `:id` route). The live stream mutates the
grid, so every case opens `#orders` fresh and calls `pauseLive()` before interacting.

Verified live against `BASE_URL` (https://mytestbed.psangrama.in) via the browser MCP on
2026-11-11. Any QA-AUTO order created during verification was removed by a reload (confirmed
`0 orders match "QA-AUTO"` afterwards).

## Discovered DOM (source of selectors)

The modal markup (captured live):

```html
<div class="modal-back" data-testid="modal-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle" data-testid="order-modal">
    <div class="modal-head">
      <h2 id="mTitle">ORD-1001</h2>                                  <!-- title = order id -->
      <button data-testid="modal-close" aria-label="Close">✕</button> <!-- the ✕ -->
    </div>
    <div class="modal-body">
      <dl class="detail">
        <dt>Customer</dt><dd>Adventure Works</dd>
        <dt>Destination</dt><dd>Miami, FL</dd>
        <dt>Items</dt><dd>21</dd>
        <dt>Amount</dt><dd>$1,739.15</dd>
        <dt>Priority</dt><dd><span class="prio medium">Medium</span></dd>
        <dt>Status</dt><dd><span class="badge b-warn">In Transit</span></dd>
      </dl>
    </div>
    <div class="modal-foot">
      <button data-testid="modal-dismiss">Close</button>          <!-- the "Close" button -->
      <button data-testid="modal-advance">Advance status</button>
    </div>
  </div>
</div>
```

### Available data-testids
| Element | Selector |
| --- | --- |
| Backdrop (whole overlay) | `[data-testid="modal-backdrop"]` |
| Dialog container | `[data-testid="order-modal"]` (also `role="dialog"`, `aria-modal="true"`) |
| ✕ close (header) | `[data-testid="modal-close"]` |
| "Close" button (footer) | `[data-testid="modal-dismiss"]` |
| "Advance status" button | `[data-testid="modal-advance"]` |

### Fields WITHOUT their own data-testid (important)
- **Title** is `<h2 id="mTitle">` — no testid. Best selector: `[data-testid="order-modal"] #mTitle`.
- The six detail fields are a `<dl class="detail">` of `<dt>`/`<dd>` pairs with **no per-field
  testids**. Best stable selector: scope to the dialog and read the `<dd>` that follows the `<dt>`
  whose text is the label (Customer/Destination/Items/Amount/Priority/Status). The Priority/Status
  values are wrapped in a `<span>` but `.getText()` on the `<dd>` returns the plain label text.
- Both close controls share the accessible name "Close" (the ✕ via `aria-label`, the footer button
  via text), so `button=Close` is **ambiguous** — always use the distinct testids above.

### Behaviour confirmed live
- Row click opens the modal; title equals the row's order id; the six fields equal the row's cells.
- ✕ (`modal-close`) and Close (`modal-dismiss`) both remove the modal + backdrop; the grid remains.
- **Advance status closes the modal** (it does not update the open dialog in place). The grid row's
  Status cell updates immediately; reopening the row shows the new status. Observed progression on a
  freshly-created QA-AUTO order: **Queued → In Transit**.

## Page object decision

Add a dedicated **`test/wdio/pageobjects/order-details.page.ts`** for the dialog's selectors and
field-reading helpers (keeps `orders.page.ts` focused on the grid). Opening the modal is a grid
action, so add one small helper to the existing **`orders.page.ts`**:

```ts
// orders.page.ts — new helpers
/** Open the details modal for the (0-based) i-th visible row by clicking its Order-id cell
 *  (not the checkbox cell, which would toggle selection instead of opening the modal). */
async openRow(i: number): Promise<void> {
  await $(`[data-testid="orders-body"] [data-testid="order-row"]:nth-of-type(${i + 1}) td:nth-child(2)`).click();
}
/** The (0-based) i-th visible row element (for reading its cells in assertions). */
rowAt(i: number) { return $(`[data-testid="orders-body"] [data-testid="order-row"]:nth-of-type(${i + 1})`); }
```

```ts
// order-details.page.ts — sketch (selectors live here only; no assertions)
import Page from './page.js';

class OrderDetailsPage extends Page {
  get dialog()     { return $('[data-testid="order-modal"]'); }
  get backdrop()   { return $('[data-testid="modal-backdrop"]'); }
  get title()      { return $('[data-testid="order-modal"] #mTitle'); }
  get closeX()     { return $('[data-testid="modal-close"]'); }
  get closeBtn()   { return $('[data-testid="modal-dismiss"]'); }
  get advanceBtn() { return $('[data-testid="modal-advance"]'); }

  /** Value of a detail field by its dt label (Customer/Destination/Items/Amount/Priority/Status). */
  field(label: string) {
    return this.dialog.$(`.//dt[normalize-space(.)="${label}"]/following-sibling::dd[1]`);
    // NOTE: relative XPath scoped to the dialog (allowed — not absolute). If the team prefers CSS,
    // read all dd via `this.dialog.$$('dl.detail dd')` in fixed order [Customer,Destination,Items,
    // Amount,Priority,Status] and index into it.
  }

  async waitForOpen(): Promise<void> { await this.dialog.waitForDisplayed(); }
  async waitForClosed(): Promise<void> {
    await this.dialog.waitForDisplayed({ reverse: true });
  }
  async closeViaX(): Promise<void>    { await this.closeX.click(); await this.waitForClosed(); }
  async closeViaButton(): Promise<void> { await this.closeBtn.click(); await this.waitForClosed(); }
  async advance(): Promise<void> {
    await this.advanceBtn.click();
    await this.waitForClosed(); // Advance closes the modal (verified live)
  }
}
export default new OrderDetailsPage();
```

> If the team disallows even relative XPath, use the fixed-order `dd` array variant noted above. The
> field order verified live is Customer, Destination, Items, Amount, Priority, Status.

---

# Order details — TC-ODTL-001 Row click opens details dialog  `@smoke`
`describe('Order details @smoke TC-ODTL-001', ...)`

Preconditions: Orders grid loaded fresh (full reload → reseeds), Live paused.
Data: none (asserts modal fields equal the clicked row's own cells — no fixture needed).

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Open `#orders` with full reload | `OrdersPage.open()` | Grid view visible | `expect(orders.view).toBeDisplayed()` |
| 2 | Pause the live stream | `OrdersPage.pauseLive()` → `[data-testid="live-toggle"]` | Toggle reads "Paused"; dataset frozen | `expect(orders.liveToggle).toHaveText('Paused')` |
| 3 | Read the first row's cells | `OrdersPage.rowAt(0)` cells (Order td2, Customer td3, Destination td4, Items td5, Amount td6, Priority td7, Status td8) | Capture `orderId` + 6 field values for comparison | (arrange only) |
| 4 | Click the first order row | `OrdersPage.openRow(0)` → `order-row:nth-of-type(1) td:nth-child(2)` | Modal dialog opens | `expect(details.dialog).toBeDisplayed()` |
| 5 | Modal title equals the order id | `[data-testid="order-modal"] #mTitle` | Title = row's Order id (e.g. "ORD-1001") | `expect(details.title).toHaveText(orderId)` |
| 6 | Each detail field equals the row cell | `details.field('Customer'|'Destination'|'Items'|'Amount'|'Priority'|'Status')` | Values match the clicked row | `expect(details.field('Customer')).toHaveText(rowCustomer)` (repeat for all six) |

Meaningful assertions: title = order id; all six fields = the originating row's values.

---

# Order details — TC-ODTL-002 Close dialog (✕ and Close button)  `@regression`
`describe('Order details @regression TC-ODTL-002', ...)`

Preconditions: Orders grid loaded fresh, Live paused.
Data: none.

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | Open `#orders` with full reload | `OrdersPage.open()` | Grid visible | `expect(orders.view).toBeDisplayed()` |
| 2 | Pause live | `OrdersPage.pauseLive()` | "Paused" | `expect(orders.liveToggle).toHaveText('Paused')` |
| 3 | Open row 0 | `OrdersPage.openRow(0)` | Modal opens | `expect(details.dialog).toBeDisplayed()` |
| 4 | Close via the ✕ | `details.closeViaX()` → `[data-testid="modal-close"]` | Dialog + backdrop removed | `expect(details.dialog).not.toBeDisplayed()` and `expect(details.backdrop).not.toBeDisplayed()` |
| 5 | Grid still shown | `[data-testid="orders-table"]` | Orders grid intact | `expect(orders.table).toBeDisplayed()` |
| 6 | Reopen row 0 | `OrdersPage.openRow(0)` | Modal opens again | `expect(details.dialog).toBeDisplayed()` |
| 7 | Close via the "Close" button | `details.closeViaButton()` → `[data-testid="modal-dismiss"]` | Dialog removed | `expect(details.dialog).not.toBeDisplayed()` |
| 8 | Grid still shown | `[data-testid="orders-table"]` | Grid intact | `expect(orders.table).toBeDisplayed()` |

Meaningful assertions: dialog closes via each control; grid remains displayed both times.
Selector note: do NOT use `button=Close` (matches both controls) — use the two testids.

---

# Order details — TC-ODTL-003 Advance status moves order to next state  `@regression`
`describe('Order details @regression TC-ODTL-003', ...)`

> **Safety-critical / needs-test-data.** NEVER advance a pre-existing order. The test creates its
> own QA-AUTO order, advances THAT one, then cleans up by reloading (reseeds the dataset).

Preconditions / lifecycle:
- `before`: `const order = await setupQaAutoOrder(IntakePage)` — creates the QA-AUTO order via the
  intake form (`test/helpers/data/orders.ts`, fixture key `TC-ODTL-003`). The fixture's
  `customerName` is `QA-AUTO-{{unique.id}}` (unique per run), `expectedInitialStatus: "Queued"`,
  `expectedNextStatus: "In Transit"`.
- `after`: `await cleanupQaAutoOrder(appDriver)` — full reload reseeds and discards the QA-AUTO order
  (verified live: 0 QA-AUTO orders remain afterwards). `appDriver.reload()` = `browser.refresh()`.

Data: `test/fixtures/orders.json → TC-ODTL-003`
(`expectedInitialStatus` = "Queued", `expectedNextStatus` = "In Transit").

| # | Action | Element / selector | Expected result | Assertion |
| --- | --- | --- | --- | --- |
| 1 | (before) Create QA-AUTO order | `setupQaAutoOrder(IntakePage)` → intake form submit → redirects to `#orders` | Order appended; URL on `#orders` | (setup; `createOrder` already waits for `#orders`) |
| 2 | Reveal grid without reload | `OrdersPage.show()` (hash-only — preserves the seeded QA-AUTO order; do NOT use `open()` here, it would reload and delete it) | Grid visible, QA-AUTO order still present | `expect(orders.view).toBeDisplayed()` |
| 3 | Pause live | `OrdersPage.pauseLive()` | "Paused" | `expect(orders.liveToggle).toHaveText('Paused')` |
| 4 | Search for the unique QA-AUTO customer | `OrdersPage.search(order.customerName)` → `[data-testid="order-search"]` | Exactly the QA-AUTO row shown | `expect(orders.matchCount).toHaveText('1 order match')` and `expect(orders.rows).toBeElementsArrayOfSize(1)` |
| 5 | Assert the row's initial status | `OrdersPage.statusCell(row)` (td8) of the only row | Status = "Queued" | `expect(orders.statusCell(row)).toHaveText(order.expectedInitialStatus)` |
| 6 | Open that QA-AUTO order | `OrdersPage.openRow(0)` | Modal opens, titled with the new order id | `expect(details.dialog).toBeDisplayed()` |
| 7 | Confirm modal initial status | `details.field('Status')` | "Queued" | `expect(details.field('Status')).toHaveText(order.expectedInitialStatus)` |
| 8 | Click "Advance status" | `details.advance()` → `[data-testid="modal-advance"]` | Status advances; **modal closes** (verified live) | `expect(details.dialog).not.toBeDisplayed()` |
| 9 | Grid row reflects the new status | `OrdersPage.statusCell(row)` (td8) after advance | Status = "In Transit" | `expect(orders.statusCell(row)).toHaveText(order.expectedNextStatus)` |
| 10 | (optional) Reopen to confirm in modal | `OrdersPage.openRow(0)` → `details.field('Status')` | Modal shows "In Transit" | `expect(details.field('Status')).toHaveText(order.expectedNextStatus)`; then `details.closeViaButton()` |
| 11 | (after) Clean up | `cleanupQaAutoOrder(appDriver)` (reload reseeds) | QA-AUTO order removed | — |

Meaningful assertions: initial status Queued (row + modal); after Advance the grid row reads
In Transit (= `expectedNextStatus`). Do not weaken these — if Advance does not progress the status,
`it.skip` with a `// BUG?` note rather than relaxing the expected value.

Notes for the generator:
- `openRow` must click the Order-id cell (`td:nth-child(2)`), not the row checkbox (`td:nth-child(1)`).
- After Advance, the modal closes — assert on the grid cell (and optionally reopen); never assert
  the open dialog shows the new value (it won't — the dialog is gone).
- The "Advance status" button has no row context of its own; it acts on the currently open order, so
  the correct order must be the one open (guaranteed here by searching the unique customer first).
