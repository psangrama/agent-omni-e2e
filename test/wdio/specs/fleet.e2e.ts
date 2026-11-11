import FleetPage from '../pageobjects/fleet.page.js';

/**
 * Fleet view (#fleet) — TC-FLEET-001..003.
 *
 * Read-only live telemetry table. No fixtures, no records: every assertion is DOM-based
 * (`window.__meridian` is a cross-check only). A full reload reseeds the in-memory demo
 * data and restores Live=on. No fixed sleeps — structure checks use web-first matchers,
 * telemetry churn uses `browser.waitUntil` polling.
 */

const EXPECTED_HEADERS = ['Vehicle', 'Driver', 'Status', 'Speed', 'Battery', 'Zone', 'Last ping'];
const NUMERIC = /^\d+$/;

describe('Fleet @smoke TC-FLEET-001', () => {
    it('loads the fleet table with vehicles and numeric summary counts', async () => {
        await FleetPage.open();
        await expect(FleetPage.view).toBeDisplayed();
        await expect(FleetPage.table).toBeDisplayed();

        // 7 business columns in the documented order. Headers render uppercase via CSS
        // text-transform, so compare case-insensitively (order and set still enforced).
        const headers = (await FleetPage.headerTexts()).map((h) => h.toLowerCase());
        expect(headers).toEqual(EXPECTED_HEADERS.map((h) => h.toLowerCase()));

        // At least one vehicle row, and the first carries a VH-style id.
        await browser.waitUntil(
            async () => (await FleetPage.rows.length) >= 1,
            { timeoutMsg: 'No vehicle rows rendered in the fleet table' }
        );
        expect(await FleetPage.firstVehicleId()).toMatch(/^VH-\d+$/);

        // Summary strip shows a numeric count for each status.
        await expect(FleetPage.onRouteCount).toBeDisplayed();
        await expect(FleetPage.onRouteCount).toHaveText(NUMERIC);
        await expect(FleetPage.chargingCount).toHaveText(NUMERIC);
        await expect(FleetPage.idleCount).toHaveText(NUMERIC);
    });
});

describe('Fleet @regression TC-FLEET-002', () => {
    it('updates telemetry for an On-Route vehicle while Live is on', async () => {
        await FleetPage.open();
        await expect(FleetPage.view).toBeDisplayed();

        // Live is on by default after a reload — assert, don't toggle.
        await expect(FleetPage.liveToggle).toHaveText('Live');

        // Snapshot an On-Route row's telemetry as the baseline (plain reads, no assert).
        const id = await FleetPage.firstOnRouteId();
        const baseline = await FleetPage.telemetry(id);

        // Poll until at least one telemetry field changes over a tick.
        await browser.waitUntil(
            async () => {
                const now = await FleetPage.telemetry(id);
                return now.speed !== baseline.speed
                    || now.battery !== baseline.battery
                    || now.lastPing !== baseline.lastPing;
            },
            { timeout: 10000, interval: 500, timeoutMsg: 'Fleet telemetry did not update while Live on' }
        );

        // Explicit web-first assertion: Last ping advances off the baseline.
        await expect(FleetPage.lastPingCell(id)).not.toHaveText(baseline.lastPing);
    });
});

describe('Fleet @regression TC-FLEET-003', () => {
    it('status summary matches the per-row status totals when paused', async () => {
        await FleetPage.open();
        await expect(FleetPage.view).toBeDisplayed();

        // Freeze the stream FIRST so summary and rows are read from one frozen tick.
        await FleetPage.pauseLive();
        await expect(FleetPage.liveToggle).toHaveText('Paused');

        const rowTotals = await FleetPage.statusTotals();
        const summary = await FleetPage.summaryCounts();

        // Each summary count equals its per-row tally.
        expect(summary).toEqual(rowTotals);

        // Conservation: the three totals cover every visible row.
        expect(summary.onRoute + summary.charging + summary.idle).toBe(await FleetPage.rows.length);
    });
});
