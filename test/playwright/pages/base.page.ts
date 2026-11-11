import type { Page } from '@playwright/test';

/**
 * Base page object (Playwright). Every page object extends this class.
 * Unlike WebdriverIO there is no global `browser`: each page object receives the test's `page`.
 */
export default class BasePage {
    /** Path relative to baseURL, e.g. '/login'. Override in subclasses. */
    protected path = '/';

    constructor(protected readonly page: Page) {}

    async open(path: string = this.path): Promise<void> {
        await this.page.goto(path);
        await this.waitForLoaded();
    }

    /** Override to wait for a page-specific element. */
    async waitForLoaded(): Promise<void> {
        await this.page.waitForLoadState('load');
    }
}
