import SettingsPage from '../pageobjects/settings.page.js';
import OrdersPage from '../pageobjects/orders.page.js';

/**
 * Settings view (#settings) — TC-SET-001..008.
 *
 * Control-only screen: no fixtures, no QA-AUTO records. Every case reopens settings with
 * `SettingsPage.open()` (full reload → reseed → Live on, theme light, interval Normal,
 * notify off) so it is independent. The only app mutation is TC-SET-006's single
 * app-generated "Add order", restored by a full reload (reseed) afterwards. `reset-data`
 * is never clicked on the shared testbed (TC-SET-007 is skipped).
 */

// Orders count label: "N orders match" (plural tolerant). Used to read the running total.
const countFrom = async (): Promise<number> => {
    const text = await OrdersPage.matchCount.getText();
    const m = text.match(/\d+/);
    return m ? parseInt(m[0], 10) : NaN;
};

describe('Settings @smoke TC-SET-001', () => {
    it('loads with Preferences, Data and Automation hooks sections', async () => {
        await SettingsPage.open();

        await expect(SettingsPage.view).toBeDisplayed();
        await expect(SettingsPage.heading).toHaveText('Settings');
        await expect(SettingsPage.sectionHeadings).toBeElementsArrayOfSize(3);

        // One signature control of each section renders. The preference toggles are
        // styled switches whose native <input type=checkbox> is CSS-hidden (opacity:0),
        // so assert they exist; the interval group and the Data buttons are visible.
        await expect(SettingsPage.liveToggle).toBeExisting();
        await expect(SettingsPage.darkToggle).toBeExisting();
        await expect(SettingsPage.notifyToggle).toBeExisting();
        await expect(SettingsPage.intervalGroup).toBeDisplayed();
        await expect(SettingsPage.resetDataBtn).toBeDisplayed();
        await expect(SettingsPage.addOrderBtn).toBeDisplayed();
        await expect(SettingsPage.automationHooks).toBeDisplayed();
    });
});

describe('Settings @regression TC-SET-002', () => {
    it('toggling Live updates off/on mirrors the header live-toggle', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.headerLiveToggle).toHaveText('Live');
        await expect(SettingsPage.liveToggle).toBeSelected();

        // Off → header mirrors "Paused" / aria-pressed=false, and window.__meridian.live=false.
        await SettingsPage.setLiveUpdates(false);
        await expect(SettingsPage.liveToggle).not.toBeSelected();
        await expect(SettingsPage.headerLiveToggle).toHaveText('Paused');
        await expect(SettingsPage.headerLiveToggle).toHaveAttribute('aria-pressed', 'false');
        expect(await browser.execute(() => (window as any).__meridian?.live)).toBe(false);

        // On → header mirrors back to "Live" / aria-pressed=true.
        await SettingsPage.setLiveUpdates(true);
        await expect(SettingsPage.headerLiveToggle).toHaveText('Live');
        await expect(SettingsPage.headerLiveToggle).toHaveAttribute('aria-pressed', 'true');
        expect(await browser.execute(() => (window as any).__meridian?.live)).toBe(true);
    });
});

describe('Settings @regression TC-SET-003', () => {
    it('enabling Dark theme sets <html data-theme="dark">; header toggle reverts it', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.darkToggle).not.toBeSelected();
        expect(await SettingsPage.htmlThemeIs('dark')).toBe(false);

        // Enable dark → html attribute switches to "dark", checkbox checked.
        await SettingsPage.setDarkTheme(true);
        await browser.waitUntil(
            async () => (await SettingsPage.htmlTheme()) === 'dark',
            { timeout: 5000, timeoutMsg: 'theme did not switch to dark' }
        );
        await expect(SettingsPage.darkToggle).toBeSelected();

        // Header theme toggle mirrors: reverts to light and unchecks set-dark.
        await SettingsPage.headerThemeToggle.click();
        await browser.waitUntil(
            async () => (await SettingsPage.htmlTheme()) === 'light',
            { timeout: 5000, timeoutMsg: 'theme did not revert to light' }
        );
        await expect(SettingsPage.darkToggle).not.toBeSelected();
    });
});

describe('Settings @regression TC-SET-004', () => {
    it('enabling Desktop notifications shows a confirmation toast', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.notifyToggle).not.toBeSelected();

        await SettingsPage.notifyToggle.click();
        await expect(SettingsPage.notifyToggle).toBeSelected();

        // Toast is transient: catch it with waitForDisplayed, never a fixed sleep.
        await SettingsPage.toast.waitForDisplayed({ timeout: 5000 });
        await expect(SettingsPage.toast).toHaveText('Notifications on');
    });
});

describe('Settings @regression TC-SET-005', () => {
    it('interval segments are mutually-exclusive pressed; intervalMs changes', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.intervalSegment('Normal')).toHaveAttribute('aria-pressed', 'true');
        expect(await browser.execute(() => (window as any).__meridian?.intervalMs)).toBe(1500);

        await SettingsPage.selectInterval('Fast');
        await expect(SettingsPage.intervalSegment('Fast')).toHaveAttribute('aria-pressed', 'true');
        await expect(SettingsPage.intervalSegment('Normal')).toHaveAttribute('aria-pressed', 'false');
        await expect(SettingsPage.intervalSegment('Slow')).toHaveAttribute('aria-pressed', 'false');
        expect(await browser.execute(() => (window as any).__meridian?.intervalMs)).toBe(700);

        await SettingsPage.selectInterval('Slow');
        await expect(SettingsPage.intervalSegment('Slow')).toHaveAttribute('aria-pressed', 'true');
        await expect(SettingsPage.intervalSegment('Fast')).toHaveAttribute('aria-pressed', 'false');
        await expect(SettingsPage.intervalSegment('Normal')).toHaveAttribute('aria-pressed', 'false');
        expect(await browser.execute(() => (window as any).__meridian?.intervalMs)).toBe(2500);
    });
});

describe('Settings @regression TC-SET-006', () => {
    // The generated order is app-generated (not QA-AUTO) and cannot be deleted
    // individually; restore the shared seed with a full reload (reseed) after the case.
    after(async () => {
        await browser.url('/#dashboard');
        await browser.refresh();
    });

    it('Add order pushes one order → Orders count increases by exactly 1', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.view).toBeDisplayed();

        // Pause Live so the stream cannot change the count concurrently (deterministic +1).
        await SettingsPage.setLiveUpdates(false);
        await expect(SettingsPage.headerLiveToggle).toHaveText('Paused');

        // Baseline count via soft nav (NO full reload — a reload would reseed and reset it).
        await OrdersPage.show();
        const n0 = await countFrom();
        expect(Number.isNaN(n0)).toBe(false);

        // Back to settings (soft) and add one generated order.
        await SettingsPage.show();
        await SettingsPage.addOrder();

        // Re-read on the grid (soft nav): count must be exactly n0 + 1.
        await OrdersPage.show();
        await browser.waitUntil(
            async () => (await countFrom()) === n0 + 1,
            { timeout: 5000, timeoutMsg: `order count did not increase by 1 (baseline ${n0})` }
        );
        expect(await countFrom()).toBe(n0 + 1);
    });
});

describe('Settings @regression TC-SET-007', () => {
    // Locating the selector is the ONLY live action allowed for this case on the shared
    // testbed; the reset itself stays skipped.
    it('reset-data control is present (never clicked on the shared testbed)', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.resetDataBtn).toBeDisplayed();
    });

    // BUG? needs-test-data — "Reset data" resets the ENTIRE SHARED demo dataset (orders,
    // fleet, counters) for every user of the testbed. Safe only on an isolated / reset-safe
    // environment, never the shared BASE_URL. Un-skip (and click reset-data) only there.
    it.skip('resets the shared demo dataset back to its seeded state — isolated env only', async () => {
        await SettingsPage.open();
        // (isolated env only) mutate then click reset-data, then assert seed counts restored.
        await expect(OrdersPage.matchCount).toHaveText(/\d+ orders? match/);
    });
});

describe('Settings @regression TC-SET-008', () => {
    it('Automation hooks block documents the testid scheme, hash routing and window.__meridian', async () => {
        await SettingsPage.open();
        await expect(SettingsPage.view).toBeDisplayed();
        await expect(SettingsPage.automationHooksHeading).toHaveText('Automation hooks');

        await expect(SettingsPage.automationHooks).toHaveText('data-testid', { containing: true });
        await expect(SettingsPage.automationHooks).toHaveText('#orders', { containing: true });
        await expect(SettingsPage.automationHooks).toHaveText('window.__meridian', { containing: true });
    });
});
