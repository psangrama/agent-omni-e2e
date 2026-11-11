import { loadFixture } from './factory';

/**
 * Precondition helpers for Orders-related cases (TC-ODTL-003 "Advance status",
 * TC-ORD-002 "Search filters rows").
 *
 * Meridian Ops Console has NO API and keeps all state in-memory; a QA-AUTO order
 * can only be created through the New Order (#intake) form, and the whole demo
 * dataset is reseeded on a full page reload. So:
 *   - setup creates the order via the engine's intake page object (injected, so this
 *     file stays engine-agnostic and shared by WDIO and Playwright),
 *   - cleanup reseeds by reloading, which discards every QA-AUTO order the test made.
 *
 * Per house rules we only ever create records we need, always named QA-AUTO-*, and
 * we only clean up what the test created — a reseed removes exactly those.
 */

export const QA_AUTO_PREFIX = 'QA-AUTO-';

export interface QaAutoOrder {
    customerName: string;
    contactEmail: string;
    destinationCity: string;
    itemCount: number;
    orderAmount: number;
    serviceLevel?: string;
    priority?: string;
    totalWeight?: number;
    deliveryNotes?: string;
    confirm: boolean;
    [key: string]: unknown;
}

/** Minimal intake driver the generator wires to its engine's intake page object. */
export interface IntakeDriver {
    /** Fill the New Order form with `order` and submit it. */
    createOrder(order: QaAutoOrder): Promise<void> | void;
}

/** Minimal app driver used to reseed state (full reload). */
export interface AppDriver {
    /** Full page reload — reseeds the in-memory demo dataset. */
    reload(): Promise<void> | void;
}

/**
 * Build a fresh QA-AUTO order from a fixture, with all {{unique.*}} placeholders
 * resolved for this run. The customer name carries the QA-AUTO- prefix so the
 * record is easy to find and the test can search for / assert on the exact token.
 *
 * @param caseId fixture key in test/fixtures/orders.json (default TC-ODTL-003)
 */
export function buildQaAutoOrder(caseId = 'TC-ODTL-003'): QaAutoOrder {
    return loadFixture<QaAutoOrder>('orders', caseId);
}

/**
 * Create one QA-AUTO order and return it (so the caller can assert on / search for
 * its unique customerName). The order is created through the injected intake driver.
 */
export async function setupQaAutoOrder(
    intake: IntakeDriver,
    caseId = 'TC-ODTL-003',
): Promise<QaAutoOrder> {
    const order = buildQaAutoOrder(caseId);
    await intake.createOrder(order);
    return order;
}

/**
 * Remove every QA-AUTO order this test created by reseeding the in-memory state.
 * A full reload restores the original seed, so no pre-existing record is touched.
 */
export async function cleanupQaAutoOrder(app: AppDriver): Promise<void> {
    await app.reload();
}
