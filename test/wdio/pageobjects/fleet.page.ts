import Page from './page.js';

/**
 * Meridian Ops Console — Fleet view (hash route `#fleet`).
 *
 * Read-only live telemetry. Selectors live here only; actions are named for user
 * intent and carry no assertions (except the page-loaded check in `waitForLoaded`).
 *
 * Cells carry no `data-testid`, so stable `data-col` attributes are preferred for
 * Status/Speed/Battery and positional `td:nth-child` is used only where no `data-col`
 * exists (Vehicle, Driver, Zone, Last ping). Summary counts carry no `data-testid`
 * but stable ids `#fleetActive/#fleetCharging/#fleetIdle`, scoped to the fleet view.
 * No absolute XPath, no hashed classes.
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

    // Cells — stable data-col where present, positional td:nth-child otherwise.
    statusCell(id: string) { return this.rowById(id).$('[data-col="status"]'); }
    speedCell(id: string) { return this.rowById(id).$('[data-col="speed"]'); }
    batteryCell(id: string) { return this.rowById(id).$('[data-col="battery"]'); }
    lastPingCell(id: string) { return this.rowById(id).$('td:nth-child(7)'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.view.waitForDisplayed();
        await this.table.waitForDisplayed();
    }

    /**
     * Open Fleet in a known-clean state. A hash-only `browser.url` does not reload
     * this SPA, so we force a full reload: that reseeds the in-memory dataset and
     * restores Live=on.
     */
    async open(): Promise<void> {
        await browser.url(this.path);
        await browser.refresh();
        await this.waitForLoaded();
    }

    /** The 7 header texts, trimmed. */
    async headerTexts(): Promise<string[]> {
        const ths = await this.table.$$('thead th');
        const out: string[] = [];
        for (const th of ths) {
            out.push((await th.getText()).trim());
        }
        return out;
    }

    /** `data-id` of the first visible row (e.g. "VH-01"). */
    async firstVehicleId(): Promise<string> {
        return (await this.rows)[0].getAttribute('data-id');
    }

    /** Normalised status of a badge: 'on route' | 'charging' | 'idle'. */
    private norm(s: string): string {
        return s.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    /** `data-id` of the first row currently On Route (for the telemetry case). */
    async firstOnRouteId(): Promise<string> {
        for (const row of await this.rows) {
            const status = this.norm(await row.$('[data-col="status"]').getText());
            if (status === 'on route') {
                return row.getAttribute('data-id');
            }
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

    /** Per-row status tally across all visible rows. */
    async statusTotals(): Promise<{ onRoute: number; charging: number; idle: number }> {
        const totals = { onRoute: 0, charging: 0, idle: 0 };
        for (const row of await this.rows) {
            const status = this.norm(await row.$('[data-col="status"]').getText());
            if (status === 'on route') totals.onRoute++;
            else if (status === 'charging') totals.charging++;
            else if (status === 'idle') totals.idle++;
        }
        return totals;
    }

    /** Summary strip counts, parsed to numbers. */
    async summaryCounts(): Promise<{ onRoute: number; charging: number; idle: number }> {
        return {
            onRoute: parseInt(await this.onRouteCount.getText(), 10),
            charging: parseInt(await this.chargingCount.getText(), 10),
            idle: parseInt(await this.idleCount.getText(), 10),
        };
    }

    /** Freeze the live stream; resolves once the toggle reads "Paused". */
    async pauseLive(): Promise<void> {
        if ((await this.liveToggle.getText()).trim() === 'Live') {
            await this.liveToggle.click();
        }
        await browser.waitUntil(
            async () => (await this.liveToggle.getText()).trim() === 'Paused',
            { timeout: 5000, timeoutMsg: 'Live toggle did not switch to Paused' }
        );
    }
}

export default new FleetPage();
