import OrdersPage from '../pageobjects/orders.page.js';
import IntakePage from '../pageobjects/intake.page.js';
import { loadFixture } from '../../helpers/data/factory.js';
import {
    setupQaAutoOrder,
    cleanupQaAutoOrder,
    type QaAutoOrder,
} from '../../helpers/data/orders.js';

/**
 * Orders grid (#orders) — TC-ORD-001..012.
 *
 * Every grid case opens #orders fresh and immediately pauses Live so the live stream
 * cannot mutate the dataset mid-assert. Assertions are count-agnostic: per-row
 * properties, the count-label format (singular/plural tolerant), aria-sort direction
 * and page-info prefixes — never fragile exact totals.
 */

// The count label pluralises the noun only: "1 order match" / "38 orders match".
const COUNT_LABEL = /^\d+ orders? match$/;

describe('Orders @smoke TC-ORD-001', () => {
    it('loads the grid with business columns, rows and a count label', async () => {
        await OrdersPage.open();
        await expect(OrdersPage.view).toBeDisplayed();
        await OrdersPage.pauseLive();

        // Header labels render uppercase via CSS; compare case-insensitively.
        const headers = (await OrdersPage.headerTexts()).map((h) => h.toLowerCase());
        for (const name of ['order', 'customer', 'destination', 'items', 'amount', 'priority', 'status']) {
            expect(headers).toContain(name);
        }

        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= 1,
            { timeoutMsg: 'No data rows rendered in the orders grid' }
        );
        await expect(OrdersPage.matchCount).toHaveText(COUNT_LABEL);
    });
});

describe('Orders @regression TC-ORD-002', () => {
    const data = loadFixture<{ searchTerm: string; minMatches: number }>('orders', 'TC-ORD-002');
    let seeded: QaAutoOrder;

    before(async () => {
        // Seed a QA-AUTO order through the real intake form; submit lands on #orders.
        seeded = await setupQaAutoOrder(IntakePage);
    });

    after(async () => {
        // Full reload reseeds in-memory state, dropping the QA-AUTO order we created.
        await cleanupQaAutoOrder({ reload: async () => { await browser.refresh(); } });
    });

    it('filters rows to those matching the search text', async () => {
        // Soft navigation (no reload) so the just-seeded order survives.
        await OrdersPage.show();
        await OrdersPage.pauseLive();
        await OrdersPage.search(data.searchTerm);

        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= data.minMatches,
            { timeoutMsg: 'Search returned no rows' }
        );

        expect(seeded.customerName).toContain(data.searchTerm);
        for (const row of await OrdersPage.rows) {
            const text = await row.getText();
            expect(text).toContain(data.searchTerm);
        }
        await expect(OrdersPage.matchCount).toHaveText(COUNT_LABEL);
    });
});

describe('Orders @regression TC-ORD-003', () => {
    const data = loadFixture<{ searchTerm: string; expectedLabel: string }>('orders', 'TC-ORD-003');

    it('shows an empty state when nothing matches the search', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();
        await OrdersPage.search(data.searchTerm);

        await expect(OrdersPage.rows).toBeElementsArrayOfSize(0);
        await expect(OrdersPage.body).toHaveText('No orders match the current filters.');
        await expect(OrdersPage.matchCount).toHaveText(data.expectedLabel);
    });
});

describe('Orders @regression TC-ORD-004', () => {
    const data = loadFixture<{ status: string }>('orders', 'TC-ORD-004');

    it('filters every visible row to the selected status', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();
        await OrdersPage.filterStatus(data.status);

        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= 1,
            { timeoutMsg: `No rows for status ${data.status}` }
        );
        for (const row of await OrdersPage.rows) {
            await expect(OrdersPage.statusCell(row)).toHaveText(data.status);
        }
        await expect(OrdersPage.matchCount).toHaveText(COUNT_LABEL);
    });
});

describe('Orders @regression TC-ORD-005', () => {
    const data = loadFixture<{ priority: string }>('orders', 'TC-ORD-005');

    it('filters every visible row to the selected priority', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();
        await OrdersPage.filterPriority(data.priority);

        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= 1,
            { timeoutMsg: `No rows for priority ${data.priority}` }
        );
        for (const row of await OrdersPage.rows) {
            await expect(OrdersPage.priorityCell(row)).toHaveText(data.priority);
        }
        await expect(OrdersPage.matchCount).toHaveText(COUNT_LABEL);
    });
});

describe('Orders @regression TC-ORD-006', () => {
    const data = loadFixture<{ status: string; priority: string }>('orders', 'TC-ORD-006');

    it('filters every visible row to both status and priority', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();
        await OrdersPage.filterStatus(data.status);
        await OrdersPage.filterPriority(data.priority);

        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= 1,
            { timeoutMsg: `No rows for ${data.status} + ${data.priority}` }
        );
        for (const row of await OrdersPage.rows) {
            await expect(OrdersPage.statusCell(row)).toHaveText(data.status);
            await expect(OrdersPage.priorityCell(row)).toHaveText(data.priority);
        }
    });
});

describe('Orders @regression TC-ORD-007', () => {
    it('reset clears the search box and both filters', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();

        await OrdersPage.search('Adventure');
        await OrdersPage.filterStatus('Delivered');
        await OrdersPage.filterPriority('Low');
        const narrowed = await OrdersPage.rows.length;

        await OrdersPage.reset();

        await expect(OrdersPage.search_).toHaveValue('');
        await expect(OrdersPage.statusFilter).toHaveValue('');
        await expect(OrdersPage.priorityFilter).toHaveValue('');
        expect(await OrdersPage.rows.length).toBeGreaterThanOrEqual(narrowed);
    });
});

describe('Orders @regression TC-ORD-008', () => {
    const data = loadFixture<{ sortColumn: string }>('orders', 'TC-ORD-008');

    it('sorts Amount ascending then descending', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();

        await OrdersPage.sortBy(data.sortColumn);
        await expect(OrdersPage.header(data.sortColumn)).toHaveAttribute('aria-sort', 'ascending');
        const asc = await OrdersPage.amountValues();
        expect(asc).toEqual([...asc].sort((x, y) => x - y));

        await OrdersPage.sortBy(data.sortColumn);
        await expect(OrdersPage.header(data.sortColumn)).toHaveAttribute('aria-sort', 'descending');
        const desc = await OrdersPage.amountValues();
        expect(desc).toEqual([...desc].sort((x, y) => y - x));
    });
});

describe('Orders @regression TC-ORD-009', () => {
    const data = loadFixture<{ rowsPerPage: number }>('orders', 'TC-ORD-009');

    it('changes the page size to 15 rows', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();

        await OrdersPage.setRowsPerPage(data.rowsPerPage);

        await expect(OrdersPage.rows).toBeElementsArrayOfSize(15);
        await expect(OrdersPage.pageInfo).toHaveText(/^Showing 1–15 of \d+$/);
    });
});

describe('Orders @regression TC-ORD-010', () => {
    it('paginates forward with Next and back with Prev', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();

        await expect(OrdersPage.pageInfo).toHaveText(/^Showing 1–8 of \d+$/);
        await expect(OrdersPage.prevBtn).toBeDisabled();
        const firstId = await OrdersPage.firstRowId();

        await OrdersPage.nextPage();
        await expect(OrdersPage.pageInfo).toHaveText(/^Showing 9–16 of \d+$/);
        await expect(OrdersPage.prevBtn).toBeEnabled();
        expect(await OrdersPage.firstRowId()).not.toBe(firstId);

        await OrdersPage.prevPage();
        await expect(OrdersPage.pageInfo).toHaveText(/^Showing 1–8 of \d+$/);
        await expect(OrdersPage.prevBtn).toBeDisabled();
        expect(await OrdersPage.firstRowId()).toBe(firstId);
    });
});

describe('Orders @regression TC-ORD-011', () => {
    it('selects a single row and then all visible rows', async () => {
        await OrdersPage.open();
        await OrdersPage.pauseLive();

        await OrdersPage.selectRow(0);
        await expect(OrdersPage.rowCheckbox(0)).toBeSelected();

        await OrdersPage.selectAll();
        for (const checkbox of await OrdersPage.rowCheckboxes) {
            await expect(checkbox).toBeSelected();
        }
        await expect(OrdersPage.selectAllBox).toBeSelected();
    });
});

describe('Orders @regression TC-ORD-012', () => {
    it('"+ New order" navigates to the intake form', async () => {
        await OrdersPage.open();
        await expect(OrdersPage.view).toBeDisplayed();

        await OrdersPage.openNewOrder();

        expect(await browser.getUrl()).toContain('#intake');
        await expect(IntakePage.view).toBeDisplayed();
    });
});
