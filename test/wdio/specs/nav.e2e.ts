import NavPage from '../pageobjects/nav.page.js';

/**
 * Meridian Ops Console — global navigation & controls (TC-NAV-001..005).
 * Read-only chrome present on every view; no fixtures and no QA-AUTO records.
 * Each `it` reopens the view so the hash-router state is fresh and the case is independent.
 */
describe('Navigation @smoke TC-NAV-001', () => {
    it('routes to each view and renders it when the primary nav buttons are clicked', async () => {
        await NavPage.open();
        await expect(NavPage.viewDashboard).toBeDisplayed();

        await NavPage.navOrders.click();
        await NavPage.viewOrders.waitForDisplayed();
        await expect(browser).toHaveUrl(expect.stringContaining('#orders'));
        await expect(await NavPage.isNavActive(await NavPage.navOrders)).toBe(true);

        await NavPage.navFleet.click();
        await NavPage.viewFleet.waitForDisplayed();
        await expect(browser).toHaveUrl(expect.stringContaining('#fleet'));
        await expect(await NavPage.isNavActive(await NavPage.navFleet)).toBe(true);

        await NavPage.navIntake.click();
        await NavPage.viewIntake.waitForDisplayed();
        await expect(browser).toHaveUrl(expect.stringContaining('#intake'));
        await expect(await NavPage.isNavActive(await NavPage.navIntake)).toBe(true);

        await NavPage.navSettings.click();
        await NavPage.viewSettings.waitForDisplayed();
        await expect(browser).toHaveUrl(expect.stringContaining('#settings'));
        await expect(await NavPage.isNavActive(await NavPage.navSettings)).toBe(true);

        await NavPage.navDashboard.click();
        await NavPage.viewDashboard.waitForDisplayed();
        await expect(browser).toHaveUrl(expect.stringContaining('#dashboard'));
        await expect(await NavPage.isNavActive(await NavPage.navDashboard)).toBe(true);
    });
});

describe('Navigation @regression TC-NAV-002', () => {
    it('deep-links directly to #fleet, rendering the Fleet view with Fleet nav active', async () => {
        await NavPage.open('/#fleet');

        await expect(NavPage.viewFleet).toBeDisplayed();
        await expect(browser).toHaveUrl(expect.stringContaining('#fleet'));
        await expect(await NavPage.isNavActive(await NavPage.navFleet)).toBe(true);
    });
});

describe('Navigation @regression TC-NAV-003', () => {
    it('highlights only the current view\'s nav item', async () => {
        await NavPage.open('/#orders');

        await expect(NavPage.viewOrders).toBeDisplayed();
        await expect(await NavPage.isNavActive(await NavPage.navOrders)).toBe(true);
        await expect(await NavPage.isNavActive(await NavPage.navFleet)).toBe(false);
    });
});

describe('Navigation @regression TC-NAV-004', () => {
    it('flips the header Live/Paused toggle in both directions', async () => {
        await NavPage.open();

        await expect(NavPage.liveToggle).toHaveText('Live');
        await expect(NavPage.liveToggle).toHaveAttribute('aria-pressed', 'true');

        await NavPage.clickLive();
        await expect(NavPage.liveToggle).toHaveText('Paused');
        await expect(NavPage.liveToggle).toHaveAttribute('aria-pressed', 'false');

        await NavPage.clickLive();
        await expect(NavPage.liveToggle).toHaveText('Live');
        await expect(NavPage.liveToggle).toHaveAttribute('aria-pressed', 'true');
    });
});

describe('Navigation @regression TC-NAV-005', () => {
    it('switches <html data-theme> on toggle and round-trips back to the baseline', async () => {
        await NavPage.open();
        await expect(NavPage.themeToggle).toBeDisplayed();

        // Seed theme (light) leaves <html> with no data-theme attribute (null). One toggle
        // moves it into an explicit, toggleable state so the round-trip is measured between
        // two real theme values (dark <-> light), not the one-time initial unset default.
        await NavPage.clickTheme();
        await browser.waitUntil(
            async () => (await NavPage.theme()) !== null,
            { timeout: 5000, timeoutMsg: 'data-theme never became explicit after first toggle' }
        );
        const before = await NavPage.theme();

        await NavPage.clickTheme();
        await browser.waitUntil(
            async () => (await NavPage.theme()) !== before,
            { timeout: 5000, timeoutMsg: 'theme did not change after toggle' }
        );
        await expect(await NavPage.theme()).not.toBe(before);

        await NavPage.clickTheme();
        await browser.waitUntil(
            async () => (await NavPage.theme()) === before,
            { timeout: 5000, timeoutMsg: 'theme did not round-trip back to baseline' }
        );
        await expect(await NavPage.theme()).toBe(before);
    });
});
