import Page from './page.js';
import type { QaAutoOrder, IntakeDriver } from '../../helpers/data/orders.js';

/**
 * Meridian Ops Console — New Order / intake form (hash route `#intake`).
 * Selectors live here only. Implements the shared `IntakeDriver` so the orders
 * precondition helpers (`setupQaAutoOrder`) can seed a QA-AUTO order through the
 * real form — the app has no API and reseeds in-memory state on full reload.
 */
class IntakePage extends Page implements IntakeDriver {
    protected path = '/#intake';

    // --- selectors ---
    get view() { return $('[data-testid="view-intake"]'); }
    get form() { return $('[data-testid="intake-form"]'); }
    get customer() { return $('[data-testid="field-customer"]'); }
    get email() { return $('[data-testid="field-email"]'); }
    get destination() { return $('[data-testid="field-destination"]'); }
    get items() { return $('[data-testid="field-items"]'); }
    get amount() { return $('[data-testid="field-amount"]'); }
    get service() { return $('[data-testid="field-service"]'); }
    get priorityGroup() { return $('[data-testid="field-priority"]'); }
    get weight() { return $('[data-testid="field-weight"]'); }
    get notes() { return $('[data-testid="field-notes"]'); }
    get terms() { return $('[data-testid="field-terms"]'); }
    get submitBtn() { return $('[data-testid="intake-submit"]'); }
    get clearBtn() { return $('[data-testid="intake-reset"]'); }
    get summary() { return $('[data-testid="form-summary"]'); }
    get weightOutput() { return $('[data-testid="weight-output"]'); }
    get date() { return $('[data-testid="field-date"]'); }

    /** Radio inside the priority radiogroup, selected by its value (Low/Medium/High). */
    priorityRadio(value: string) { return this.priorityGroup.$(`input[value="${value}"]`); }

    /** Per-field inline error span (field ∈ customer/email/destination/items/amount/terms). */
    error(field: string) { return $(`[data-testid="err-${field}"]`); }

    async waitForLoaded(): Promise<void> {
        await super.waitForLoaded();
        await this.form.waitForDisplayed();
    }

    /**
     * Open a known-clean New Order form. A hash-only `browser.url` does not re-render this
     * SPA, so a form already on `#intake` would keep the previous case's field state. Force a
     * full reload: that reseeds the in-memory dataset and gives every case a pristine form.
     */
    async open(): Promise<void> {
        await browser.url(this.path);
        await browser.refresh();
        await this.waitForLoaded();
    }

    /**
     * Fill the New Order form with `order` and submit it. Opens a fresh intake form
     * first, then resolves once the app has navigated to the orders grid (`#intake`
     * redirects to `#orders` on a successful submit).
     */
    async createOrder(order: QaAutoOrder): Promise<void> {
        await this.open();

        await this.customer.setValue(order.customerName);
        await this.email.setValue(order.contactEmail);
        await this.destination.setValue(order.destinationCity);
        await this.items.setValue(String(order.itemCount));
        await this.amount.setValue(String(order.orderAmount));

        if (order.serviceLevel) {
            await this.service.selectByVisibleText(order.serviceLevel);
        }
        if (order.priority) {
            await this.priorityRadio(order.priority).click();
        }
        if (order.deliveryNotes) {
            await this.notes.setValue(order.deliveryNotes);
        }
        if (order.confirm && !(await this.terms.isSelected())) {
            await this.terms.click();
        }

        await this.submitBtn.click();
        await browser.waitUntil(
            async () => (await browser.getUrl()).includes('#orders'),
            { timeout: 10000, timeoutMsg: 'Intake submit did not navigate to #orders' }
        );
    }

    /** Selected priority radio value (Low/Medium/High), read from the radiogroup. */
    async checkedPriority(): Promise<string> {
        return this.priorityGroup.$('input:checked').getAttribute('value');
    }

    /** Pick a service level by its visible option text (Standard/Express/Overnight/Freight). */
    async selectService(text: string): Promise<void> {
        await this.service.selectByVisibleText(text);
    }

    /** Select a priority radio by value (Low/Medium/High). */
    async selectPriority(value: string): Promise<void> {
        await this.priorityRadio(value).click();
    }

    /**
     * Set the total-weight range slider deterministically and fire an `input` event so
     * the `<output>` readout updates (range `setValue` is unreliable). Selector stays here.
     */
    async setWeight(n: number): Promise<void> {
        await browser.execute((v: number) => {
            const el = document.querySelector('[data-testid="field-weight"]') as HTMLInputElement | null;
            if (!el) return;
            el.value = String(v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, n);
    }

    /** Click Create order WITHOUT waiting for navigation — for negative / validation cases. */
    async submit(): Promise<void> {
        await this.submitBtn.click();
    }

    /**
     * Non-submitting variant of `createOrder`: open a fresh form and fill only the fields
     * provided on `order`. Numeric fields use `!= null` so 0 and negatives are entered.
     * The confirm checkbox is ticked only when `order.confirm === true`.
     */
    async fill(order: Partial<QaAutoOrder>): Promise<void> {
        await this.open();

        if (order.customerName != null) await this.customer.setValue(order.customerName);
        if (order.contactEmail != null) await this.email.setValue(order.contactEmail);
        if (order.destinationCity != null) await this.destination.setValue(order.destinationCity);
        if (order.itemCount != null) await this.items.setValue(String(order.itemCount));
        if (order.orderAmount != null) await this.amount.setValue(String(order.orderAmount));
        if (order.serviceLevel) await this.selectService(order.serviceLevel);
        if (order.priority) await this.selectPriority(order.priority);
        if (order.deliveryNotes) await this.notes.setValue(order.deliveryNotes);
        if (order.confirm === true && !(await this.terms.isSelected())) await this.terms.click();
    }

    /** Trusted click on Clear form — resets fields, clears errors/summary, re-syncs readout. */
    async clearForm(): Promise<void> {
        await this.clearBtn.click();
    }
}

export default new IntakePage();
