# Test case catalog — Meridian Ops Console — 2026-11-11

- **App:** Meridian Ops Console (Fleet Control)
- **URL:** https://mytestbed.psangrama.in
- **Date:** 2026-11-11
- **Authentication:** none observed (app loads straight to the Dashboard; no sign-in form or SSO redirect appeared)
- **App type:** single-page app, hash routing (`#dashboard`, `#orders`, `#fleet`, `#intake`, `#settings`). State is in-memory only (no localStorage); a full page reload reseeds demo data. A read-only state snapshot is exposed on `window.__meridian`. Every interactive element exposes a stable `data-testid` (views `view-*`, nav `nav-*`, grids `orders-table` / `fleet-table`, `live-toggle`, `reset-data`).

## How to approve

> Set the **Status** of each case to `approved` or `rejected` (leave `new` to decide later),
> save the file, then run `/qa-automate` in Claude Code. Only `approved` cases are automated.

## Page inventory

| Route | Page name | Found via | Cases |
| --- | --- | --- | --- |
| `#dashboard` | Dashboard (live KPIs, throughput sparkline, activity feed) | Primary nav / default route | TC-DASH-001..004 |
| `#orders` | Orders (sortable/filterable/paginated grid) | Primary nav | TC-ORD-001..012 |
| `#orders` → row dialog | Order details dialog (modal, not a route) | Clicking an order row | TC-ODTL-001..003 |
| `#fleet` | Fleet (live vehicle telemetry table, read-only) | Primary nav | TC-FLEET-001..003 |
| `#intake` | New Order (intake form) | Primary nav / "+ New order" | TC-INTK-001..012 |
| `#settings` | Settings (preferences, data controls, automation hooks) | Primary nav | TC-SET-001..008 |
| (global) | Header / primary navigation, Live-Paused toggle, theme toggle | Present on every view | TC-NAV-001..005 |

No `:id` detail routes exist — order details open in a modal dialog over `#orders`. Scope: whole app, no restriction. No pages hit the safety cap.

---

## Dashboard (`#dashboard`)

Live KPI cards (Active orders, In transit, Delivered today, Revenue, On-time rate), an "Updated HH:MM:SS" / "Ticks N" indicator, a throughput sparkline, and an activity feed with a **Clear** button. Figures stream while **Live** is on.

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-DASH-001 | Dashboard loads and shows KPI cards | P1 | positive | App open | Open `#dashboard` | Heading "Dashboard" + 5 KPI cards (Active orders, In transit, Delivered today, Revenue, On-time rate) render with values | @smoke | automated |
| TC-DASH-002 | Live stream updates ticks/timestamp | P2 | positive | Live is on | Observe "Ticks" and "Updated" over two ticks | Tick count increments and "Updated" timestamp changes | @regression | automated |
| TC-DASH-003 | Pausing Live freezes the figures | P2 | positive | Live is on | Click Live/Paused toggle | Button shows "Paused"; ticks stop incrementing (deterministic state) | @regression | automated |
| TC-DASH-004 | Clear activity feed empties the feed | P3 | positive | Feed has entries | Click "Clear" on Activity feed | Activity feed list is emptied | @regression | automated |

---

## Orders (`#orders`)

Search box, status filter, priority filter, Reset, sortable column headers, per-row select checkboxes, select-all, pagination (rows-per-page + Prev/Next), a result-count label ("N orders match"), a "+ New order" button, and row click → details dialog.

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ORD-001 | Orders grid loads with rows and headers | P1 | positive | App open | Open `#orders` | Table with columns Order/Customer/Destination/Items/Amount/Priority/Status and ≥1 row; count label shown | @smoke | automated |
| TC-ORD-002 | Search filters rows by text | P2 | positive | Grid has data | Type a customer/order substring in Search | Only matching rows shown; count label updates ("N order(s) match") | @regression | automated |
| TC-ORD-003 | Search with no match shows zero results | P3 | negative | Grid has data | Search a string present in no row (e.g. "ZZZZ") | "0 orders match"; empty grid body | @regression | automated |
| TC-ORD-004 | Filter by status | P2 | positive | Grid has data | Choose "In Transit" in status filter | Only In-Transit rows shown; count updates | @regression | automated |
| TC-ORD-005 | Filter by priority | P2 | positive | Grid has data | Choose "High" in priority filter | Only High-priority rows shown; count updates | @regression | automated |
| TC-ORD-006 | Combined status + priority filter | P3 | positive | Grid has data | Set status=Delivered and priority=Low | Rows match both filters | @regression | automated |
| TC-ORD-007 | Reset clears search and filters | P2 | positive | A filter/search active | Click Reset | Search cleared, filters back to "All…", full count restored | @regression | automated |
| TC-ORD-008 | Sort by a column ascending/descending | P2 | positive | Grid has data | Click "Amount" header twice | Rows sort asc then desc; header arrow indicator toggles | @regression | automated |
| TC-ORD-009 | Change rows per page | P2 | positive | >8 orders exist | Select 15 in "Rows" | Up to 15 rows shown; "Showing 1–15 of N" updates | @regression | automated |
| TC-ORD-010 | Paginate with Next / Prev | P2 | positive | >1 page of orders | Click "Next ›" then "‹ Prev" | Page advances then returns; Prev disabled on page 1 | @regression | automated |
| TC-ORD-011 | Select a single row and select-all | P3 | positive | Grid has data | Tick a row checkbox, then header "Select all" | Row(s) and all visible rows become selected | @regression | automated |
| TC-ORD-012 | "+ New order" opens the intake form | P2 | positive | On Orders | Click "+ New order" | Navigates to `#intake` (New Order form) | @regression | automated |

### Field rules — Orders controls
| Field | Type | Required | Rules | Validation message |
| --- | --- | --- | --- | --- |
| Search orders | text | no | free text; matches order id / customer / destination | — |
| Filter by status | select | no | All statuses, Queued, In Transit, Delivered, Delayed | — |
| Filter by priority | select | no | All priorities, High, Medium, Low | — |
| Rows per page | select | no | 5, 8 (default), 15, 25 | — |
| Sortable columns | — | — | Order, Customer, Destination, Items, Amount, Priority, Status | — |

---

## Order details dialog (modal over `#orders`)

Opened by clicking a row. Shows Customer, Destination, Items, Amount, Priority, Status as a definition list, with **Close** and **Advance status** actions.

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ODTL-001 | Row click opens details dialog | P1 | positive | Orders grid loaded | Click an order row | Modal titled with the order id shows Customer/Destination/Items/Amount/Priority/Status matching the row | @smoke | automated |
| TC-ODTL-002 | Close dialog (✕ and Close button) | P2 | positive | Dialog open | Click ✕, reopen, click "Close" | Dialog closes both ways; grid still shown | @regression | automated |
| TC-ODTL-003 | Advance status moves order to next state | P2 | positive | **needs-test-data** — requires a QA-AUTO order created in-test (never advance a pre-existing order) | Create a QA-AUTO order, open it, click "Advance status" | Status progresses to the next value (e.g. Queued → In Transit); reflected in grid | @regression | automated |

---

## Fleet (`#fleet`)

Read-only live telemetry table (Vehicle, Driver, Status, Speed, Battery, Zone, Last ping) with a status summary (On route / Charging / Idle counts). Speed and battery update each tick while Live is on.

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-FLEET-001 | Fleet table loads with vehicles | P1 | positive | App open | Open `#fleet` | Table with 7 columns and ≥1 vehicle row (VH-xx) renders; summary counts shown | @smoke | automated |
| TC-FLEET-002 | Telemetry updates while Live is on | P2 | positive | Live is on | Observe Speed/Battery/Last ping over a tick | Values and "Last ping" update for On-Route vehicles | @regression | automated |
| TC-FLEET-003 | Status summary matches row statuses | P3 | positive | Fleet loaded | Count rows per status, compare to summary | "On route / Charging / Idle" counts equal the row totals | @regression | automated |

---

## New Order (`#intake`)

Form that appends a row to the Orders grid on submit. Mixed input types with required-field and email validation; a summary "N field(s) need attention." appears on invalid submit.

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-INTK-001 | New Order form loads with all fields | P1 | positive | App open | Open `#intake` | Form shows all fields + "Create order" / "Clear form" buttons | @smoke | automated |
| TC-INTK-002 | Create a valid order (happy path) | P1 | positive | On intake | Fill all required with a `QA-AUTO-` customer, check confirm, submit | Navigates to `#orders`; new row appended; order count +1 | @smoke | automated |
| TC-INTK-003 | Submit empty form shows required errors | P1 | negative | On intake | Click "Create order" with empty form | 6 field errors shown + "6 field(s) need attention." (see Field rules) | @regression | automated |
| TC-INTK-004 | Invalid email format is rejected | P2 | negative | On intake | Enter "not-an-email" in Contact email, submit | "Enter a valid email address." shown; not submitted | @regression | automated |
| TC-INTK-005 | Missing confirm checkbox blocks submit | P2 | negative | Required fields filled | Leave confirm unchecked, submit | "Please confirm the details."; order not created | @regression | automated |
| TC-INTK-006 | Express service sets High priority | P2 | positive | On intake | Select Service level "Express" | Priority is driven to High (per "Express or Overnight sets High priority") | @regression | automated |
| TC-INTK-007 | Overnight service sets High priority | P3 | positive | On intake | Select Service level "Overnight" | Priority set to High | @regression | automated |
| TC-INTK-008 | Priority radios selectable | P3 | positive | On intake | Select Low, then High | Chosen radio becomes checked (default was Medium) | @regression | automated |
| TC-INTK-009 | Weight slider updates readout | P3 | positive | On intake | Move the "Total weight" slider | Numeric readout (kg) reflects slider value (default 25) | @regression | automated |
| TC-INTK-010 | Requested date defaults to today | P3 | positive | On intake | Submit without a Requested date | Order uses today's date (field is optional) | @regression | automated |
| TC-INTK-011 | Clear form resets all fields | P2 | positive | Fields filled | Click "Clear form" | All inputs reset to defaults; errors cleared | @regression | automated |
| TC-INTK-012 | Item count / amount boundary (0 or negative) | P3 | boundary | On intake | Enter 0 / negative item count and amount, submit | App validates or coerces non-positive numeric values consistently (observe behaviour) | @regression | automated |

### Field rules — New Order
| Field | Type | Required | Rules | Validation message |
| --- | --- | --- | --- | --- |
| Customer name | text | yes | — | "Customer name is required." |
| Contact email | email | yes | must be a valid email format | "Email is required." / "Enter a valid email address." |
| Destination city | text | yes | — | "Destination is required." |
| Item count | number (spinbutton) | yes | — | "Item count is required." |
| Order amount (USD) | number (spinbutton) | yes | — | "Amount is required." |
| Requested date | text/date | no | defaults to today | — |
| Service level | select | no | Standard (default), Express, Overnight, Freight; Express/Overnight force High priority | — |
| Priority | radio | no | Low, Medium (default), High | — |
| Total weight | slider | no | default 25 kg | — |
| Delivery notes | textarea | no | placeholder "Gate codes, handling instructions…" | — |
| Confirm shipping details | checkbox | yes | must be checked | "Please confirm the details." |
| (form summary) | — | — | shown on invalid submit | "N field(s) need attention." |

---

## Settings (`#settings`)

Preferences (toggles + interval), a Data section, and an Automation-hooks info block.

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-SET-001 | Settings page loads with all sections | P1 | positive | App open | Open `#settings` | Preferences, Data, and Automation hooks sections render | @smoke | automated |
| TC-SET-002 | Toggle "Live updates" pauses/resumes feed | P2 | positive | On settings | Toggle "Live updates" | Mirrors header Live/Paused state; feed stops/starts | @regression | automated |
| TC-SET-003 | Toggle "Dark theme" | P2 | positive | On settings | Toggle "Dark theme" | Theme switches; mirrors header theme toggle | @regression | automated |
| TC-SET-004 | Desktop notifications toggle shows toast | P3 | positive | On settings | Enable "Desktop notifications" | A confirmation toast appears on save | @regression | automated |
| TC-SET-005 | Update interval Slow/Normal/Fast | P3 | positive | On settings | Click "Fast", then "Slow" | Selected segment becomes pressed; feed tick rate changes | @regression | automated |
| TC-SET-006 | "Add order" pushes a generated order | P2 | positive | On settings | Click "Add order" | Orders count increases by 1 (generated order queued) | @regression | automated |
| TC-SET-007 | "Reset data" restores seeded state | P2 | positive | **needs-test-data** — resets shared demo state; run only against an isolated/reset-safe environment | Click "Reset data" | Orders, fleet, and counters return to initial seed | @regression | automated |
| TC-SET-008 | Automation-hooks info lists stable testids | P3 | positive | On settings | Read the Automation hooks block | Documents `data-testid` scheme, hash routing, `window.__meridian` | @regression | automated |

---

## Global navigation & controls (every view)

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-NAV-001 | Primary nav routes to each view | P1 | positive | App open | Click Dashboard, Orders, Fleet, New Order, Settings | Hash + active-nav state change to `#dashboard/#orders/#fleet/#intake/#settings`; correct view renders | @smoke | automated |
| TC-NAV-002 | Deep-link by URL hash | P2 | positive | — | Navigate directly to `#fleet` | Fleet view renders and Fleet nav is active | @regression | automated |
| TC-NAV-003 | Active nav item is highlighted | P3 | positive | On any view | Observe nav | The current view's nav button has active state | @regression | automated |
| TC-NAV-004 | Header Live/Paused toggle | P2 | positive | Any view | Click the Live/Paused control | Toggles between "Live" (pressed) and "Paused" | @regression | automated |
| TC-NAV-005 | Header theme toggle switches theme | P3 | positive | Any view | Click "Toggle theme" (◐) | Page theme switches light/dark | @regression | automated |

---

## Obsolete specs

- `test/wdio/specs/home.e2e.ts` and `test/playwright/specs/home.spec.ts` — template "home" specs that predate this app. There is no standalone "home" page; the default route is the Dashboard (`#dashboard`). Flagged for the human to replace or remove (not deleted by the explorer).

## Could not reach

- **TC-SET-007 "Reset data"** could not be exercised live: the environment's auto-mode classifier blocked the click as a shared-resource mutation (it resets the whole demo dataset for the environment). Captured as a `needs-test-data` case to run only against an isolated/reset-safe environment.
- **TC-ODTL-003 "Advance status"** was not performed — safety rule: never mutate a record this session did not create. Captured as `needs-test-data` (create a QA-AUTO order first, then advance it).
- No other pages were unreachable. `/sitemap.xml` was not consulted — this is a hash-routed SPA, so it would return the app HTML rather than a route list; the primary nav + `window.__meridian` gave the complete route set.
