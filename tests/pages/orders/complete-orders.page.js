import { expect } from "@playwright/test";

export class CompletedOrdersPage {
  constructor(page) {
    this.page = page;
    // Locators
    this.completedTabButton = page.getByTestId("completed-segment-button");
    this.orderCards = page.getByTestId("order-card");
    this.giftCardActivationButton = page.getByTestId(
      "gift-card-activation-button",
    );
    this.firstCard = page.getByTestId("order-card").first();
    this.printCustomerLetterButton = page.getByTestId("packing-slip-button");
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
    await this.refreshBeforeTabSwitch();
    await this.completedTabButton.waitFor({ state: "visible" });
    await this.completedTabButton.click({ force: true });

    await this.firstCard.waitFor({ state: "visible" }).catch(() => { });
  }

  async openFirstGiftCardOrder() {
    const giftCardOrders = this.orderCards.filter({
      has: this.giftCardActivationButton,
    });
    const firstGiftCard = giftCardOrders.first();
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
    const printCustomerLetterButton = firstCard.getByTestId(
      "packing-slip-button",
    );
    await expect(printCustomerLetterButton).toBeVisible();
    await printCustomerLetterButton.click();
  }
}
