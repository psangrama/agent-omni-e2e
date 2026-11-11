import IntakePage from '../pageobjects/intake.page.js';
import OrdersPage from '../pageobjects/orders.page.js';
import { loadFixture } from '../../helpers/data/factory.js';
import { cleanupQaAutoOrder, type QaAutoOrder } from '../../helpers/data/orders.js';

/**
 * New Order / intake form (#intake) — TC-INTK-001..012.
 *
 * The form does its own validation (`<form novalidate>`): a valid submit appends a row
 * to #orders and auto-navigates there; an invalid submit stays on #intake and renders
 * per-field error spans plus an "N field(s) need attention." summary. Selectors live in
 * the page object; the spec drives it through getters/methods only. No fixed sleeps.
 *
 * Only TC-INTK-002 and TC-INTK-010 create a record (a QA-AUTO- order); each cleans up in
 * `after` via a full reload, which reseeds the in-memory dataset and drops the order.
 */

// App driver for cleanup: a full reload reseeds state, dropping any QA-AUTO order created.
const app = { reload: async () => { await browser.refresh(); } };

describe('Intake @smoke TC-INTK-001', () => {
    it('loads the New Order form with every field and both buttons', async () => {
        await IntakePage.open();

        await expect(IntakePage.view).toBeDisplayed();
        await expect(IntakePage.form).toBeDisplayed();

        for (const field of [
            IntakePage.customer, IntakePage.email, IntakePage.destination,
            IntakePage.items, IntakePage.amount, IntakePage.service,
            IntakePage.priorityGroup, IntakePage.weight, IntakePage.notes, IntakePage.terms,
        ]) {
            await expect(field).toBeDisplayed();
        }

        await expect(IntakePage.submitBtn).toHaveText('Create order');
        await expect(IntakePage.clearBtn).toHaveText('Clear form');
    });
});

describe('Intake @smoke TC-INTK-002', () => {
    const order = loadFixture<QaAutoOrder>('intake', 'TC-INTK-002');

    after(async () => {
        await cleanupQaAutoOrder(app);
    });

    it('creates a valid order and appends the QA-AUTO row to the grid', async () => {
        await IntakePage.createOrder(order);

        expect(await browser.getUrl()).toContain('#orders');

        await OrdersPage.pauseLive();
        await OrdersPage.search(order.customerName);
        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= 1,
            { timeoutMsg: 'Created QA-AUTO order not found in the grid' }
        );

        await expect(OrdersPage.customerCell(OrdersPage.rowAt(0))).toHaveText(order.customerName);
    });
});

describe('Intake @regression TC-INTK-003', () => {
    const data = loadFixture<{ expectedSummary: string; expectedErrors: string[] }>('intake', 'TC-INTK-003');

    it('shows all six required-field errors when the empty form is submitted', async () => {
        await IntakePage.open();
        await expect(IntakePage.form).toBeDisplayed();

        await IntakePage.submit();
        expect(await browser.getUrl()).toContain('#intake');

        await expect(IntakePage.error('customer')).toHaveText('Customer name is required.');
        await expect(IntakePage.error('email')).toHaveText('Email is required.');
        await expect(IntakePage.error('destination')).toHaveText('Destination is required.');
        await expect(IntakePage.error('items')).toHaveText('Item count is required.');
        await expect(IntakePage.error('amount')).toHaveText('Amount is required.');
        await expect(IntakePage.error('terms')).toHaveText('Please confirm the details.');

        await expect(IntakePage.summary).toHaveText(data.expectedSummary);
    });
});

describe('Intake @regression TC-INTK-004', () => {
    const data = loadFixture<QaAutoOrder & { expectedMessage: string }>('intake', 'TC-INTK-004');

    it('rejects an invalid email format and blocks the submit', async () => {
        await IntakePage.fill(data);

        await IntakePage.submit();
        expect(await browser.getUrl()).toContain('#intake');

        await expect(IntakePage.error('email')).toHaveText(data.expectedMessage);
        await expect(IntakePage.summary).toHaveText('1 field(s) need attention.');
    });
});

describe('Intake @regression TC-INTK-005', () => {
    const data = loadFixture<QaAutoOrder & { expectedMessage: string }>('intake', 'TC-INTK-005');

    it('blocks the submit when the confirm checkbox is left off', async () => {
        await IntakePage.fill(data);
        await expect(IntakePage.terms).not.toBeSelected();

        await IntakePage.submit();
        expect(await browser.getUrl()).toContain('#intake');

        await expect(IntakePage.error('terms')).toHaveText(data.expectedMessage);
    });
});

describe('Intake @regression TC-INTK-006', () => {
    const data = loadFixture<{ expectedPriority: string }>('intake', 'TC-INTK-006');

    it('drives priority to High when Express service is selected', async () => {
        await IntakePage.open();
        await expect(IntakePage.priorityRadio('Medium')).toBeSelected();

        await IntakePage.selectService('Express');

        await expect(IntakePage.priorityRadio(data.expectedPriority)).toBeSelected();
    });
});

describe('Intake @regression TC-INTK-007', () => {
    const data = loadFixture<{ expectedPriority: string }>('intake', 'TC-INTK-007');

    it('drives priority to High when Overnight service is selected', async () => {
        await IntakePage.open();
        await expect(IntakePage.priorityRadio('Medium')).toBeSelected();

        await IntakePage.selectService('Overnight');

        await expect(IntakePage.priorityRadio(data.expectedPriority)).toBeSelected();
    });
});

describe('Intake @regression TC-INTK-008', () => {
    const data = loadFixture<{ priorityFirst: string; prioritySecond: string; defaultPriority: string }>('intake', 'TC-INTK-008');

    it('selects the priority radios exclusively', async () => {
        await IntakePage.open();
        await expect(IntakePage.priorityRadio(data.defaultPriority)).toBeSelected();

        await IntakePage.selectPriority(data.priorityFirst);
        await expect(IntakePage.priorityRadio(data.priorityFirst)).toBeSelected();

        await IntakePage.selectPriority(data.prioritySecond);
        await expect(IntakePage.priorityRadio(data.prioritySecond)).toBeSelected();
        await expect(IntakePage.priorityRadio(data.priorityFirst)).not.toBeSelected();
    });
});

describe('Intake @regression TC-INTK-009', () => {
    const data = loadFixture<{ totalWeight: number; defaultWeight: number }>('intake', 'TC-INTK-009');

    it('updates the weight readout when the slider moves from 25 to 60', async () => {
        await IntakePage.open();
        await expect(IntakePage.weightOutput).toHaveText(String(data.defaultWeight));

        await IntakePage.setWeight(data.totalWeight);

        await expect(IntakePage.weightOutput).toHaveText(String(data.totalWeight));
        await expect(IntakePage.weight).toHaveValue(String(data.totalWeight));
    });
});

describe('Intake @regression TC-INTK-010', () => {
    const order = loadFixture<QaAutoOrder>('intake', 'TC-INTK-010');

    after(async () => {
        await cleanupQaAutoOrder(app);
    });

    it('creates the order with Requested date left blank and defaults it to today', async () => {
        await IntakePage.open();
        await expect(IntakePage.date).toHaveValue('');

        await IntakePage.createOrder(order);
        expect(await browser.getUrl()).toContain('#orders');

        await OrdersPage.pauseLive();
        await OrdersPage.search(order.customerName);
        await browser.waitUntil(
            async () => (await OrdersPage.rows.length) >= 1,
            { timeoutMsg: 'Created QA-AUTO order not found in the grid' }
        );
        await expect(OrdersPage.customerCell(OrdersPage.rowAt(0))).toHaveText(order.customerName);

        // No requested-date is surfaced in any UI, so cross-check the created timestamp
        // from the read-only in-memory snapshot: it must fall on today.
        const ts = await browser.execute((customer: string) => {
            const w = window as unknown as { __meridian?: { orders?: Array<{ customer: string; created: number }> } };
            const o = w.__meridian?.orders?.find((x) => x.customer === customer);
            return o ? o.created : null;
        }, order.customerName);

        expect(ts).not.toBeNull();
        expect(new Date(ts as number).toDateString()).toBe(new Date().toDateString());
    });
});

describe('Intake @regression TC-INTK-011', () => {
    const data = loadFixture<QaAutoOrder & { totalWeight: number }>('intake', 'TC-INTK-011');

    it('resets every field and clears errors when Clear form is clicked', async () => {
        await IntakePage.fill(data);
        await IntakePage.setWeight(data.totalWeight);

        // Make at least one error + the summary visible first, to prove they clear.
        await IntakePage.email.setValue('not-an-email');
        await IntakePage.submit();
        await expect(IntakePage.error('email')).toHaveText('Enter a valid email address.');

        await IntakePage.clearForm();

        for (const field of [
            IntakePage.customer, IntakePage.email, IntakePage.destination,
            IntakePage.items, IntakePage.amount, IntakePage.notes,
        ]) {
            await expect(field).toHaveValue('');
        }

        await expect(IntakePage.service).toHaveValue('Standard');
        await expect(IntakePage.priorityRadio('Medium')).toBeSelected();
        await expect(IntakePage.weight).toHaveValue('25');
        await expect(IntakePage.weightOutput).toHaveText('25');
        await expect(IntakePage.terms).not.toBeSelected();

        await expect(IntakePage.error('email')).toHaveText('');
        await expect(IntakePage.summary).toHaveText('');
    });
});

describe('Intake @regression TC-INTK-012', () => {
    const data = loadFixture<{ zero: QaAutoOrder; negative: QaAutoOrder }>('intake', 'TC-INTK-012');

    it('validates non-positive item count and amount consistently', async () => {
        // Zero variant: items min=1 rejects 0; amount min=0 accepts 0.
        await IntakePage.fill(data.zero);
        await IntakePage.submit();
        expect(await browser.getUrl()).toContain('#intake');

        await expect(IntakePage.error('items')).toHaveText('Enter 1–500 items.');
        await expect(IntakePage.error('amount')).toHaveText('');
        await expect(IntakePage.summary).toHaveText('1 field(s) need attention.');

        // Negative variant: items rejects negatives; amount rejects negatives.
        await IntakePage.clearForm();
        await IntakePage.fill(data.negative);
        await IntakePage.submit();
        expect(await browser.getUrl()).toContain('#intake');

        await expect(IntakePage.error('items')).toHaveText('Enter 1–500 items.');
        await expect(IntakePage.error('amount')).toHaveText('Amount must be 0 or more.');
        await expect(IntakePage.summary).toHaveText('2 field(s) need attention.');
    });
});
