import DashboardPage from '../pageobjects/dashboard.page.js';

/**
 * Meridian Ops Console — Dashboard (TC-DASH-001..004).
 * Read-only live-state view; no fixtures and no QA-AUTO records. Each `it` reopens the
 * dashboard so state is reseeded (in-memory, Live defaults on) and the case is independent.
 */
describe('Dashboard @smoke TC-DASH-001', () => {
    it('loads the dashboard and shows 5 KPI cards with non-empty values', async () => {
        await DashboardPage.open();

        await expect(DashboardPage.view).toBeDisplayed();
        await expect(DashboardPage.heading).toHaveText('Dashboard');

        await expect(DashboardPage.kpiTiles).toBeElementsArrayOfSize(5);

        await expect(DashboardPage.kpiActive).toHaveText('Active orders', { containing: true });
        await expect(DashboardPage.kpiTransit).toHaveText('In transit', { containing: true });
        await expect(DashboardPage.kpiDelivered).toHaveText('Delivered today', { containing: true });
        await expect(DashboardPage.kpiRevenue).toHaveText('Revenue', { containing: true });
        await expect(DashboardPage.kpiOntime).toHaveText('On-time rate', { containing: true });

        await expect(DashboardPage.kpiActiveValue).toHaveText(expect.stringMatching(/\d/));
        await expect(DashboardPage.kpiTransitValue).toHaveText(expect.stringMatching(/\d/));
        await expect(DashboardPage.kpiDeliveredValue).toHaveText(expect.stringMatching(/\d/));
        await expect(DashboardPage.kpiRevenueValue).toHaveText(expect.stringMatching(/^\$[\d,]+$/));
        await expect(DashboardPage.kpiOntimeValue).toHaveText(expect.stringMatching(/^\d+%$/));
    });
});

describe('Dashboard @regression TC-DASH-002', () => {
    it('advances tick count and timestamp while Live is on', async () => {
        await DashboardPage.open();

        await expect(DashboardPage.liveToggle).toHaveText('Live');

        const tick0 = Number(await DashboardPage.tickCount.getText());
        const ts0 = await DashboardPage.lastUpdate.getText();

        await browser.waitUntil(
            async () => Number(await DashboardPage.tickCount.getText()) >= tick0 + 2,
            { timeout: 10000, timeoutMsg: 'Tick count did not advance by 2 while Live' }
        );

        await expect(DashboardPage.lastUpdate).not.toHaveText(ts0);
    });
});

describe('Dashboard @regression TC-DASH-003', () => {
    it('freezes the figures when Live is paused', async () => {
        await DashboardPage.open();

        await expect(DashboardPage.liveToggle).toHaveText('Live');
        await expect(DashboardPage.liveToggle).toHaveAttribute('aria-pressed', 'true');

        await DashboardPage.pauseLive();

        await expect(DashboardPage.liveToggle).toHaveText('Paused');
        await expect(DashboardPage.liveToggle).toHaveAttribute('aria-pressed', 'false');

        const tickPaused = Number(await DashboardPage.tickCount.getText());

        // Poll every 500 ms for ~3 s (≥2 tick intervals). The value must stay frozen the
        // whole time, so waitUntil is expected to time out; then assert it is unchanged.
        await browser
            .waitUntil(
                async () => Number(await DashboardPage.tickCount.getText()) !== tickPaused,
                { timeout: 3500, interval: 500, timeoutMsg: 'stable' }
            )
            .catch(() => { /* expected: tick count never changed while paused */ });

        await expect(DashboardPage.tickCount).toHaveText(String(tickPaused));
    });
});

describe('Dashboard @regression TC-DASH-004', () => {
    it('empties the activity feed when Clear is clicked', async () => {
        await DashboardPage.open();

        await browser.waitUntil(
            async () => (await DashboardPage.feedItems).length > 0,
            { timeout: 10000, timeoutMsg: 'Activity feed never populated with any items' }
        );

        // Pause first so the live stream does not re-populate the feed after Clear.
        await DashboardPage.pauseLive();
        await expect(DashboardPage.liveToggle).toHaveText('Paused');

        await DashboardPage.clearFeed();

        await expect(DashboardPage.feedItems).toBeElementsArrayOfSize(0);
        await expect(DashboardPage.activityFeed).toHaveText('No activity yet.');
    });
});
