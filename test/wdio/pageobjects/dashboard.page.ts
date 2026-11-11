import Page from './page.js';

/**
 * Meridian Ops Console — Dashboard view (hash route `#dashboard`).
 * Selectors live here only. Read-only live-state screen; no records created.
 */
class DashboardPage extends Page {
    protected path = '/#dashboard';

    get view() { return $('[data-testid="view-dashboard"]'); }
    get heading() { return $('[data-testid="view-dashboard"] h1'); }

    get tickCount() { return $('[data-testid="tick-count"]'); }
    get lastUpdate() { return $('[data-testid="last-update"]'); }

    get kpiTiles() {
        return $$('[data-testid="kpi-tiles"] [data-testid^="kpi-"]:not([data-testid$="-value"])');
    }
    get kpiActive() { return $('[data-testid="kpi-active"]'); }
    get kpiActiveValue() { return $('[data-testid="kpi-active-value"]'); }
    get kpiTransit() { return $('[data-testid="kpi-transit"]'); }
    get kpiTransitValue() { return $('[data-testid="kpi-transit-value"]'); }
    get kpiDelivered() { return $('[data-testid="kpi-delivered"]'); }
    get kpiDeliveredValue() { return $('[data-testid="kpi-delivered-value"]'); }
    get kpiRevenue() { return $('[data-testid="kpi-revenue"]'); }
    get kpiRevenueValue() { return $('[data-testid="kpi-revenue-value"]'); }
    get kpiOntime() { return $('[data-testid="kpi-ontime"]'); }
    get kpiOntimeValue() { return $('[data-testid="kpi-ontime-value"]'); }

    get liveToggle() { return $('[data-testid="live-toggle"]'); }
    get activityFeed() { return $('[data-testid="activity-feed"]'); }
    get feedItems() { return $$('[data-testid="feed-item"]'); }
    get feedClear() { return $('[data-testid="feed-clear"]'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.view.waitForDisplayed();
    }

    /** Pause the live stream if it is running; resolves once the toggle reads "Paused". */
    async pauseLive(): Promise<void> {
        if ((await this.liveToggle.getText()).trim() === 'Live') {
            await this.liveToggle.click();
        }
        await browser.waitUntil(
            async () => (await this.liveToggle.getText()).trim() === 'Paused',
            { timeout: 5000, timeoutMsg: 'Live toggle did not switch to Paused' }
        );
    }

    async clearFeed(): Promise<void> {
        await this.feedClear.click();
    }
}

export default new DashboardPage();
