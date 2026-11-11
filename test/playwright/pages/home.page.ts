import BasePage from './base.page.js';

/**
 * GOLD-STANDARD EXAMPLE (Playwright). The site's home page at BASE_URL.
 * Generated page objects follow this shape: locators as getters, actions as async methods.
 */
export default class HomePage extends BasePage {
    protected path = '/';

    get body() { return this.page.locator('body'); }
}
