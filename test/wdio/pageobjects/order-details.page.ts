import Page from './page.js';

/**
 * Meridian Ops Console — Order details MODAL dialog (opens over the `#orders` grid;
 * there is no `:id` route). Selectors live here only; methods carry no assertions.
 *
 * The six detail fields are a `<dl class="detail">` of `<dt>`/`<dd>` pairs with NO
 * per-field testids. They render in a fixed order, so `field(label)` maps the label
 * to its position and reads the matching `<dd>` (scoped to the dialog) via stable CSS
 * — no absolute XPath. `getText()` on the `<dd>` returns the plain value even when it
 * wraps a `<span>` (Priority/Status).
 *
 * Behaviour (verified live, see plans/order-details.md): ✕ (`modal-close`) and the
 * footer "Close" button (`modal-dismiss`) both remove the dialog and backdrop while
 * the grid stays; "Advance status" (`modal-advance`) CLOSES the dialog and updates the
 * grid row's Status cell — so status assertions after an advance read the grid, not the
 * (now gone) dialog.
 */
class OrderDetailsPage extends Page {
    /** Fixed render order of the detail fields (source: live DOM). */
    private static readonly FIELD_ORDER = [
        'Customer',
        'Destination',
        'Items',
        'Amount',
        'Priority',
        'Status',
    ] as const;

    // --- selectors ---
    get dialog() { return $('[data-testid="order-modal"]'); }
    get backdrop() { return $('[data-testid="modal-backdrop"]'); }
    get title() { return $('[data-testid="order-modal"] #mTitle'); }
    get closeX() { return $('[data-testid="modal-close"]'); }
    get closeBtn() { return $('[data-testid="modal-dismiss"]'); }
    get advanceBtn() { return $('[data-testid="modal-advance"]'); }

    /**
     * The `<dd>` value element for a detail field by its `<dt>` label
     * (Customer/Destination/Items/Amount/Priority/Status). Uses the fixed field order
     * and `dd:nth-of-type(...)`, scoped to the open dialog — stable CSS, no XPath.
     */
    field(label: string) {
        const index = OrderDetailsPage.FIELD_ORDER.indexOf(label as typeof OrderDetailsPage.FIELD_ORDER[number]);
        if (index === -1) {
            throw new Error(`Unknown detail field "${label}"; expected one of ${OrderDetailsPage.FIELD_ORDER.join(', ')}`);
        }
        return this.dialog.$(`dl.detail dd:nth-of-type(${index + 1})`);
    }

    async waitForOpen(): Promise<void> {
        await this.dialog.waitForDisplayed();
    }

    async waitForClosed(): Promise<void> {
        await this.dialog.waitForDisplayed({ reverse: true });
    }

    /** Close the dialog with the header ✕ (`modal-close`). */
    async closeViaX(): Promise<void> {
        await this.closeX.click();
        await this.waitForClosed();
    }

    /** Close the dialog with the footer "Close" button (`modal-dismiss`). */
    async closeViaButton(): Promise<void> {
        await this.closeBtn.click();
        await this.waitForClosed();
    }

    /** Advance the open order to its next status. NOTE: this CLOSES the dialog. */
    async advance(): Promise<void> {
        await this.advanceBtn.click();
        await this.waitForClosed();
    }
}

export default new OrderDetailsPage();
