import Page from './page.js';

/**
 * GOLD-STANDARD EXAMPLE (WebdriverIO). The site's home page at BASE_URL.
 * Generated page objects follow this shape: selectors as getters, actions as async methods.
 */
class HomePage extends Page {
    protected path = '/';

    get body() { return $('body'); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.body.waitForDisplayed();
    }
}

export default new HomePage();
