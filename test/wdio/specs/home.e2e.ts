import HomePage from '../pageobjects/home.page.js';

/**
 * GOLD-STANDARD EXAMPLE (WebdriverIO): shows the structure every generated spec follows.
 * Works on any site: it only checks that BASE_URL opens with a title and visible content.
 */
describe('Home @smoke TC-EXAMPLE-001', () => {
    it('opens the home page with a title and visible content', async () => {
        await HomePage.open();

        const title = await browser.getTitle();
        expect(title.trim()).not.toBe('');
        await expect(HomePage.body).toBeDisplayed();
    });
});
