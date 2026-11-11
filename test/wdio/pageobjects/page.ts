/**
 * Base page object. Every page object extends this class.
 */
export default class Page {
    /** Path relative to baseUrl, e.g. '/login'. Override in subclasses. */
    protected path = '/';

    async open(path: string = this.path): Promise<void> {
        await browser.url(path);
        await this.waitForLoaded();
    }

    /** Override to wait for a page-specific element. */
    async waitForLoaded(): Promise<void> {
        await browser.waitUntil(
            async () => (await browser.execute(() => document.readyState)) === 'complete',
            { timeout: 15000, timeoutMsg: `Page ${this.path} did not finish loading` }
        );
    }
}
