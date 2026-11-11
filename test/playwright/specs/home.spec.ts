import { test, expect } from '@playwright/test';
import HomePage from '../pages/home.page.js';

/**
 * GOLD-STANDARD EXAMPLE (Playwright): shows the structure every generated spec follows.
 * Works on any site: it only checks that BASE_URL opens with a title and visible content.
 */
test.describe('Home @smoke TC-EXAMPLE-001', () => {
    test('opens the home page with a title and visible content', async ({ page }) => {
        const home = new HomePage(page);
        await home.open();

        await expect(page).toHaveTitle(/\S/);
        await expect(home.body).toBeVisible();
    });
});
