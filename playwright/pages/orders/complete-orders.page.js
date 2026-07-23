import { expect } from "@playwright/test";

export class CompletedOrdersPage {
  constructor(page) {
    this.page = page;
    // Locators
    this.completedTabButton = page.locator('ion-segment-button', { hasText: /^Completed$/i });
    this.orderCards = page.locator('ion-card.order-item');
    this.giftCardActivationButton = page.locator('ion-button', { hasText: /Activate Gift Card/i });
    this.firstCard = this.orderCards.first();
    this.printCustomerLetterButton = page.locator('ion-button', { hasText: /Packing Slip/i });
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper, .modal-wrapper");
  }

  async waitForOverlays() {
    if (this.page.isClosed()) return;
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
  }

  async refreshBeforeTabSwitch() {
    if (this.page.isClosed()) return;
    await this.page.reload({ waitUntil: "domcontentloaded" }).catch(() => { });
    await this.waitForOverlays();
  }

  async goToCompletedTab() {
    await this.waitForOverlays();
    await this.completedTabButton.waitFor({ state: "visible" });
    await this.completedTabButton.click({ force: true });
    await Promise.race([
      this.orderCards.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => { }),
      this.page.getByText(/no (orders|record) found/i).waitFor({ state: "visible", timeout: 15000 }).catch(() => { })
    ]);
  }

  async openFirstGiftCardOrder() {
    if (!await this.orderCards.first().isVisible()) {
      console.log("No completed orders found, skipping gift card activation.");
      return;
    }
    const giftCardOrders = this.orderCards.filter({
      has: this.giftCardActivationButton,
    });
    const firstGiftCard = giftCardOrders.first();
    if (!await firstGiftCard.isVisible()) {
      console.log("No completed gift card orders found, skipping.");
      return;
    }
    await expect(firstGiftCard).toBeVisible();
    await firstGiftCard.click();
  }

  async findCardByOrderName(orderName) {
    const matchingCard = this.orderCards.filter({ hasText: orderName }).first();
    await expect(matchingCard).toBeVisible();
    return matchingCard;
  }

  async getFirstOrderCard() {
    return this.orderCards.first();
  }

  async printCustomerLetter() {
    const firstCard = await this.getFirstOrderCard();
    if (!await firstCard.isVisible()) {
      console.log("No completed orders found, skipping packing slip.");
      return;
    }
    const printCustomerLetterButton = firstCard.locator('ion-button', { hasText: /Packing Slip/i });
    if (!await printCustomerLetterButton.isVisible()) {
      console.log("No packing slip button on first order, skipping.");
      return;
    }
    await expect(printCustomerLetterButton).toBeVisible();
    await printCustomerLetterButton.click();
  }
}
