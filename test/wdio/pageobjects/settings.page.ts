import Page from './page.js';

/**
 * Meridian Ops Console — Settings view (hash route `#settings`).
 *
 * Selectors live here only. This is a control-only screen; no QA-AUTO records are
 * created. The `reset-data` getter is exposed for presence/documentation checks ONLY —
 * no page-object action clicks it (it resets the whole SHARED demo dataset; see
 * TC-SET-007). No assertions live in this class except the `waitForLoaded` check.
 *
 * `open()` forces a full reload (reseed → Live on, theme light, interval Normal,
 * notify off) so each case starts from a known state; `show()` reveals the view with a
 * hash-only change, preserving in-memory state (used by TC-SET-006 around Add order).
 */
class SettingsPage extends Page {
    protected path = '/#settings';

    // --- view / structure ---
    get view() { return $('[data-testid="view-settings"]'); }
    get heading() { return $('[data-testid="view-settings"] h1'); }
    get sectionHeadings() { return $$('[data-testid="view-settings"] h2'); }

    // --- Preferences ---
    get liveToggle() { return $('[data-testid="set-live"]'); }
    get darkToggle() { return $('[data-testid="set-dark"]'); }
    get notifyToggle() { return $('[data-testid="set-notify"]'); }
    get intervalGroup() { return $('[data-testid="set-interval"]'); }
    /** Segment buttons carry no own testid → select by accessible name within the group. */
    intervalSegment(name: 'Slow' | 'Normal' | 'Fast') {
        return this.intervalGroup.$(`aria/${name}`);
    }

    // --- Data ---
    /** LOCATE ONLY — never clicked by the suite on the shared testbed (TC-SET-007). */
    get resetDataBtn() { return $('[data-testid="reset-data"]'); }
    get addOrderBtn() { return $('[data-testid="add-random"]'); }

    // --- Toast + automation hooks ---
    get toast() { return $('[data-testid="toast-stack"] [data-testid="toast"]'); }
    get automationHooksHeading() { return this.view.$('h2*=Automation hooks'); }
    /** The hooks info paragraph (the one documenting the `window.__meridian` snapshot). */
    get automationHooks() { return this.view.$('p*=window.__meridian'); }

    // --- Header mirrors (global controls) ---
    get headerLiveToggle() { return $('[data-testid="live-toggle"]'); }
    get headerThemeToggle() { return $('[data-testid="theme-toggle"]'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.view.waitForDisplayed();
    }

    /**
     * Open settings in a known-clean state. A hash-only `browser.url` does not reload
     * this SPA, so force a full reload: that reseeds the in-memory dataset and resets
     * Live (on), theme (light) and interval (Normal) left by a previous case.
     */
    async open(): Promise<void> {
        await browser.url(this.path);
        await browser.refresh();
        await this.waitForLoaded();
    }

    /**
     * Reveal the settings view WITHOUT a full reload (hash change only), preserving any
     * in-memory state such as a just-added order. Use `open()` for a deterministic reseed.
     */
    async show(): Promise<void> {
        await browser.execute(() => { window.location.hash = '#settings'; });
        await this.waitForLoaded();
    }

    /** Current `<html data-theme>` value ('dark' | 'light' | null). */
    async htmlTheme(): Promise<string | null> {
        return browser.execute(() => document.documentElement.getAttribute('data-theme'));
    }
    async htmlThemeIs(value: string): Promise<boolean> {
        return (await this.htmlTheme()) === value;
    }

    /** Set a checkbox preference to a desired state, clicking only if needed. */
    private async setChecked(el: WebdriverIO.Element, want: boolean): Promise<void> {
        if ((await el.isSelected()) !== want) {
            await el.click();
        }
        await browser.waitUntil(
            async () => (await el.isSelected()) === want,
            { timeout: 5000, timeoutMsg: 'checkbox did not reach the desired state' }
        );
    }

    async setLiveUpdates(on: boolean): Promise<void> {
        await this.setChecked(await this.liveToggle, on);
    }

    async setDarkTheme(on: boolean): Promise<void> {
        await this.setChecked(await this.darkToggle, on);
    }

    async selectInterval(name: 'Slow' | 'Normal' | 'Fast'): Promise<void> {
        await this.intervalSegment(name).click();
        await browser.waitUntil(
            async () => (await this.intervalSegment(name).getAttribute('aria-pressed')) === 'true',
            { timeout: 5000, timeoutMsg: `interval ${name} did not become pressed` }
        );
    }

    async addOrder(): Promise<void> {
        await this.addOrderBtn.click();
    }
}

export default new SettingsPage();
