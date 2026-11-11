import Page from './page.js';

/**
 * Meridian Ops Console — Orders view (hash route `#orders`).
 * Selectors live here only; actions are named for user intent and carry no assertions
 * (except the page-loaded check in `waitForLoaded`).
 *
 * Live stream note: the grid auto-appends orders while Live is ON, so every grid case
 * opens `#orders` fresh and immediately calls `pauseLive()` to freeze the dataset before
 * asserting. Assertions stay count-agnostic (per-row props, label format, aria-sort).
 */
class OrdersPage extends Page {
    protected path = '/#orders';

    // --- selectors ---
    get view() { return $('[data-testid="view-orders"]'); }
    get newOrderBtn() { return $('[data-testid="orders-new"]'); }
    get search_() { return $('[data-testid="order-search"]'); }
    get statusFilter() { return $('[data-testid="order-status-filter"]'); }
    get priorityFilter() { return $('[data-testid="order-priority-filter"]'); }
    get resetBtn() { return $('[data-testid="order-filter-reset"]'); }
    get matchCount() { return $('[data-testid="order-match-count"]'); }
    get table() { return $('[data-testid="orders-table"]'); }
    get body() { return $('[data-testid="orders-body"]'); }
    get rows() { return $$('[data-testid="order-row"]'); }
    get selectAllBox() { return $('[data-testid="order-select-all"]'); }
    get rowCheckboxes() { return $$('[data-testid="order-row"] input[type="checkbox"]'); }
    get pageInfo() { return $('[data-testid="order-page-info"]'); }
    get pageSize() { return $('[data-testid="order-page-size"]'); }
    get prevBtn() { return $('[data-testid="order-page-prev"]'); }
    get nextBtn() { return $('[data-testid="order-page-next"]'); }
    get liveToggle() { return $('[data-testid="live-toggle"]'); }

    /** Sortable header `<th>` selected by its (partial) text; headers carry no testid. */
    header(name: string) { return this.table.$(`th*=${name}`); }

    /** Cells by column index (col 1 = checkbox): 2 Order, 3 Customer, 4 Destination,
     *  5 Items, 6 Amount, 7 Priority, 8 Status. */
    orderCell(row: WebdriverIO.Element) { return row.$('td:nth-child(2)'); }
    customerCell(row: WebdriverIO.Element) { return row.$('td:nth-child(3)'); }
    destinationCell(row: WebdriverIO.Element) { return row.$('td:nth-child(4)'); }
    itemsCell(row: WebdriverIO.Element) { return row.$('td:nth-child(5)'); }
    amountCell(row: WebdriverIO.Element) { return row.$('td:nth-child(6)'); }
    priorityCell(row: WebdriverIO.Element) { return row.$('td:nth-child(7)'); }
    statusCell(row: WebdriverIO.Element) { return row.$('td:nth-child(8)'); }

    /**
     * The row's six detail values keyed by the modal's `<dt>` labels, in the same
     * fixed order the dialog renders them. Lets a spec compare the grid row against
     * the open details dialog without owning any selectors.
     */
    async rowDetailValues(row: WebdriverIO.Element): Promise<Record<string, string>> {
        return {
            Customer: (await this.customerCell(row).getText()).trim(),
            Destination: (await this.destinationCell(row).getText()).trim(),
            Items: (await this.itemsCell(row).getText()).trim(),
            Amount: (await this.amountCell(row).getText()).trim(),
            Priority: (await this.priorityCell(row).getText()).trim(),
            Status: (await this.statusCell(row).getText()).trim(),
        };
    }

    /** Checkbox of the (0-based) i-th visible row. */
    rowCheckbox(i: number) {
        return $(`[data-testid="orders-body"] [data-testid="order-row"]:nth-of-type(${i + 1}) input[type="checkbox"]`);
    }

    /** The (0-based) i-th visible row element (for reading its cells in assertions). */
    rowAt(i: number) {
        return $(`[data-testid="orders-body"] [data-testid="order-row"]:nth-of-type(${i + 1})`);
    }

    /**
     * Open the details modal for the (0-based) i-th visible row by clicking its
     * Order-id cell (`td:nth-child(2)`) — NOT the checkbox cell (`td:nth-child(1)`),
     * which would toggle selection instead of opening the dialog.
     */
    async openRow(i: number): Promise<void> {
        await this.rowAt(i).$('td:nth-child(2)').click();
    }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.view.waitForDisplayed();
    }

    /**
     * Open the grid in a known-clean state. A hash-only `browser.url` does not reload
     * this SPA, so we force a full reload: that reseeds the in-memory dataset and clears
     * any search, filter, page-size or Live state left by a previous case.
     */
    async open(): Promise<void> {
        await browser.url(this.path);
        await browser.refresh();
        await this.waitForLoaded();
    }

    /**
     * Reveal the grid WITHOUT a full reload (hash change only), preserving in-memory
     * state such as a just-seeded QA-AUTO order. Use after creating a record; use
     * `open()` (inherited, full navigation) for the deterministic reseeded grid.
     */
    async show(): Promise<void> {
        await browser.execute(() => { window.location.hash = '#orders'; });
        await this.waitForLoaded();
    }

    /** Pause the live stream if running; resolves once the toggle reads "Paused". */
    async pauseLive(): Promise<void> {
        if ((await this.liveToggle.getText()).trim() === 'Live') {
            await this.liveToggle.click();
        }
        await browser.waitUntil(
            async () => (await this.liveToggle.getText()).trim() === 'Paused',
            { timeout: 5000, timeoutMsg: 'Live toggle did not switch to Paused' }
        );
    }

    async search(term: string): Promise<void> {
        await this.search_.setValue(term);
    }

    async filterStatus(text: string): Promise<void> {
        await this.statusFilter.selectByVisibleText(text);
    }

    async filterPriority(text: string): Promise<void> {
        await this.priorityFilter.selectByVisibleText(text);
    }

    async reset(): Promise<void> {
        await this.resetBtn.click();
    }

    async setRowsPerPage(n: number): Promise<void> {
        await this.pageSize.selectByVisibleText(String(n));
    }

    async sortBy(name: string): Promise<void> {
        await this.header(name).click();
    }

    async nextPage(): Promise<void> {
        await this.nextBtn.click();
    }

    async prevPage(): Promise<void> {
        await this.prevBtn.click();
    }

    async selectRow(i: number): Promise<void> {
        await this.rowCheckbox(i).click();
    }

    async selectAll(): Promise<void> {
        await this.selectAllBox.click();
    }

    async openNewOrder(): Promise<void> {
        await this.newOrderBtn.click();
        await browser.waitUntil(
            async () => (await browser.getUrl()).includes('#intake'),
            { timeout: 5000, timeoutMsg: 'Did not navigate to #intake' }
        );
    }

    /** Header texts with the sort-arrow glyph stripped (keeps letters/spaces only). */
    async headerTexts(): Promise<string[]> {
        const ths = await this.table.$$('thead th');
        const texts: string[] = [];
        for (const th of ths) {
            texts.push((await th.getText()).replace(/[^A-Za-z ]/g, '').trim());
        }
        return texts;
    }

    /** Visible Amount cells parsed to numbers (strips "$" and thousands separators). */
    async amountValues(): Promise<number[]> {
        const values: number[] = [];
        for (const row of await this.rows) {
            const text = await this.amountCell(row).getText();
            values.push(parseFloat(text.replace(/[$,]/g, '')));
        }
        return values;
    }

    /** `data-id` of the first visible row (e.g. "ORD-1001"). */
    async firstRowId(): Promise<string> {
        return $$('[data-testid="order-row"]')[0].getAttribute('data-id');
    }
}

export default new OrdersPage();
