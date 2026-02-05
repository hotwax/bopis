import { expect } from "@playwright/test";

export class PackedOrderPage {
  constructor(page) {
    this.page = page;
    this.packedTabButton = page.getByTestId("packed-segment-button");
    this.orderCards = page.getByTestId("order-card");
    this.firstCard = page.getByTestId("order-card").first();
    this.giftCardActivationButton = this.page.getByTestId(
      "gift-card-activation-button",
    );
    this.readyForHandoverButton = this.firstCard.getByTestId("handover-button");
    this.printPackingSlipButton = page.getByTestId("packing-slip-button");
  }

  async goToPackedTab() {
    await this.packedTabButton.waitFor({ state: "visible" });
    await this.packedTabButton.click();
    const firstPackedCard = this.orderCards.first();
    await firstPackedCard.waitFor({ state: "visible" });
  }

  async getFirstOrderCard() {
    return this.orderCards.first();
  }

  async openFirstGiftCardOrder() {
    const giftCardOrders = this.orderCards.filter({
      has: this.giftCardActivationButton,
    });
    const firstCard = giftCardOrders.first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
  }

  async openFirstOrderDetail() {
    const firstCard = await this.getFirstOrderCard();
    await firstCard.click();
  }

  async clickHandover() {
    await expect(this.readyForHandoverButton).toBeVisible();
    await this.readyForHandoverButton.click();
  }

  async printPackingSlipFromList() {
    const firstCard = await this.getFirstOrderCard();
    const packingButton = firstCard.getByTestId("packing-slip-button");
    await expect(packingButton).toBeVisible();
    const [popup] = await Promise.all([
      this.page.waitForEvent("popup"),
      packingButton.click(),
    ]);
    const url = popup.url();
    expect(url).toMatch(/(blob|pdf)/);
    console.log(`Packing slip opened in new tab (List Page): ${url}`);
  }
}
