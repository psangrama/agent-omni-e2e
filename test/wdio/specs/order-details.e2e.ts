import OrdersPage from '../pageobjects/orders.page.js';
import OrderDetailsPage from '../pageobjects/order-details.page.js';
import IntakePage from '../pageobjects/intake.page.js';
import {
    setupQaAutoOrder,
    cleanupQaAutoOrder,
    type QaAutoOrder,
} from '../../helpers/data/orders.js';

/**
 * Order details dialog (modal over #orders) — TC-ODTL-001..003.
 *
 * Meridian Ops Console is a hash-routed SPA that reseeds its in-memory dataset on a
 * full reload, and its live stream mutates the grid. So every case opens #orders fresh
 * and pauses Live before interacting. Order details open in a MODAL (no :id route).
 *
 * Field labels the dialog renders, in fixed order.
 */
const DETAIL_FIELDS = ['Customer', 'Destination', 'Items', 'Amount', 'Priority', 'Status'] as const;

describe('Order details @smoke TC-ODTL-001', () => {
    it('opens a row and shows the order id and the six fields of that grid row', async () => {
        await OrdersPage.open();
        await expect(OrdersPage.view).toBeDisplayed();
        await OrdersPage.pauseLive();

        // Arrange: capture the first row's own order id + six detail values.
        const row = await OrdersPage.rowAt(0);
        const orderId = (await OrdersPage.orderCell(row).getText()).trim();
        const rowValues = await OrdersPage.rowDetailValues(row);

        // Act: open that row's details dialog.
        await OrdersPage.openRow(0);
        await OrderDetailsPage.waitForOpen();
        await expect(OrderDetailsPage.dialog).toBeDisplayed();

        // Assert: title equals the order id and every field equals the row's cell.
        await expect(OrderDetailsPage.title).toHaveText(orderId);
        for (const label of DETAIL_FIELDS) {
            await expect(OrderDetailsPage.field(label)).toHaveText(rowValues[label]);
        }
    });
});

describe('Order details @regression TC-ODTL-002', () => {
    it('closes via the ✕ and via the "Close" button, leaving the grid shown each time', async () => {
        await OrdersPage.open();
        await expect(OrdersPage.view).toBeDisplayed();
        await OrdersPage.pauseLive();

        // Close via the header ✕ (modal-close).
        await OrdersPage.openRow(0);
        await OrderDetailsPage.waitForOpen();
        await expect(OrderDetailsPage.dialog).toBeDisplayed();

        await OrderDetailsPage.closeViaX();
        await expect(OrderDetailsPage.dialog).not.toBeDisplayed();
        await expect(OrderDetailsPage.backdrop).not.toBeDisplayed();
        await expect(OrdersPage.table).toBeDisplayed();

        // Reopen and close via the footer "Close" button (modal-dismiss).
        await OrdersPage.openRow(0);
        await OrderDetailsPage.waitForOpen();
        await expect(OrderDetailsPage.dialog).toBeDisplayed();

        await OrderDetailsPage.closeViaButton();
        await expect(OrderDetailsPage.dialog).not.toBeDisplayed();
        await expect(OrdersPage.table).toBeDisplayed();
    });
});

describe('Order details @regression TC-ODTL-003', () => {
    // SAFETY-CRITICAL: advances ONLY the QA-AUTO order this test creates; never a
    // pre-existing order. Cleanup reseeds the dataset (full reload), discarding it.
    let order: QaAutoOrder;

    before(async () => {
        // Seed a QA-AUTO order via the real intake form (fixture TC-ODTL-003).
        order = await setupQaAutoOrder(IntakePage, 'TC-ODTL-003');
    });

    after(async () => {
        await cleanupQaAutoOrder({ reload: async () => { await browser.refresh(); } });
    });

    it('advances the QA-AUTO order from Queued to In Transit', async () => {
        const initialStatus = String(order.expectedInitialStatus);
        const nextStatus = String(order.expectedNextStatus);

        // Soft navigation (hash only) so the just-seeded QA-AUTO order survives.
        await OrdersPage.show();
        await expect(OrdersPage.view).toBeDisplayed();
        await OrdersPage.pauseLive();

        // Narrow to exactly the unique QA-AUTO row so the advance targets only it.
        await OrdersPage.search(order.customerName);
        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) === 1,
            { timeoutMsg: `Expected exactly one row for ${order.customerName}` }
        );
        const row = await OrdersPage.rowAt(0);
        await expect(OrdersPage.statusCell(row)).toHaveText(initialStatus);

        // Open that order; confirm the dialog shows the initial status.
        await OrdersPage.openRow(0);
        await OrderDetailsPage.waitForOpen();
        await expect(OrderDetailsPage.field('Status')).toHaveText(initialStatus);

        // Advance — this CLOSES the dialog and updates the grid row's Status cell.
        await OrderDetailsPage.advance();
        await expect(OrderDetailsPage.dialog).not.toBeDisplayed();

        // Assert the grid row reflects the next status.
        const advancedRow = await OrdersPage.rowAt(0);
        await expect(OrdersPage.statusCell(advancedRow)).toHaveText(nextStatus);
    });
});
