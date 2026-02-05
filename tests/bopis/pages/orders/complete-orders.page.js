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
  }
  async goToCompletedTab() {
    await this.completedTabButton.waitFor({ state: "visible" });
    await this.completedTabButton.click();

    const firstCard = this.orderCards.first();
    await firstCard.waitFor({ state: "visible" });
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
