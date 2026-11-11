import Page from './page.js';

/**
 * Meridian Ops Console — global chrome (primary nav + header controls).
 * Present on every view (hash-routed SPA). Selectors live here only.
 * Read-only; no records created.
 */
class NavPage extends Page {
    protected path = '/#dashboard';

    // Primary nav buttons
    get navDashboard() { return $('[data-testid="nav-dashboard"]'); }
    get navOrders()    { return $('[data-testid="nav-orders"]'); }
    get navFleet()     { return $('[data-testid="nav-fleet"]'); }
    get navIntake()    { return $('[data-testid="nav-intake"]'); }   // New Order; note: NO aria-pressed
    get navSettings()  { return $('[data-testid="nav-settings"]'); }

    // Views (one per route)
    get viewDashboard() { return $('[data-testid="view-dashboard"]'); }
    get viewOrders()    { return $('[data-testid="view-orders"]'); }
    get viewFleet()     { return $('[data-testid="view-fleet"]'); }
    get viewIntake()    { return $('[data-testid="view-intake"]'); }
    get viewSettings()  { return $('[data-testid="view-settings"]'); }

    // Header controls
    get liveToggle()  { return $('[data-testid="live-toggle"]'); }
    get themeToggle() { return $('[data-testid="theme-toggle"]'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.navDashboard.waitForDisplayed();
    }

    /** Read the <html data-theme> attribute (e.g. "dark" | "light" | null). */
    async theme(): Promise<string | null> {
        return browser.execute(() => document.documentElement.getAttribute('data-theme'));
    }

    /**
     * Whether a nav button is the active (current-view) one.
     * The app marks the active item with aria-current="page" (confirmed on the live DOM);
     * an active CSS class is kept as a fallback. aria-pressed is intentionally NOT used as
     * the cross-view signal because nav-intake has no aria-pressed.
     */
    async isNavActive(el: WebdriverIO.Element): Promise<boolean> {
        if ((await el.getAttribute('aria-current')) === 'page') return true;
        const cls = (await el.getAttribute('class')) ?? '';
        return /(^|\s)(is-active|active)(\s|$)/.test(cls);
    }

    async clickLive()  { await this.liveToggle.click(); }
    async clickTheme() { await this.themeToggle.click(); }
}

export default new NavPage();
