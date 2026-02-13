import { expect } from "@playwright/test";

export class PackedOrderPage {
  constructor(page) {
    this.page = page;
    this.packedTabButton = page.getByTestId("packed-segment-button");
    this.packedOrdersContainer = page.getByTestId("packed-orders-container");
    this.orderCards = this.packedOrdersContainer.getByTestId("order-card");
    this.firstCard = this.orderCards.first();
    this.noOrdersMessage = page.getByText(/no (orders|record) found/i);
    this.giftCardActivationButton = this.page.getByTestId(
      "gift-card-activation-button",
    );
    this.readyForHandoverButton = this.firstCard.getByTestId("handover-button");
    this.printPackingSlipButton = page.getByTestId("packing-slip-button");
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper, .modal-wrapper");
  }

  async waitForOverlays() {
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
  }

  async refreshBeforeTabSwitch() {
    await this.page.reload({ waitUntil: "domcontentloaded" }).catch(() => { });
    await this.waitForOverlays();
  }


  async goToPackedTab() {
    await this.waitForOverlays();
    await this.refreshBeforeTabSwitch();
    await this.packedTabButton.waitFor({ state: "visible" });
    await this.packedTabButton.click({ force: true });
    await Promise.race([
      this.packedOrdersContainer.waitFor({ state: "visible", timeout: 20000 }).catch(() => { }),
      this.noOrdersMessage.waitFor({ state: "visible", timeout: 20000 }).catch(() => { }),
    ]);
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
    await this.waitForOverlays();
    const total = await this.orderCards.count();
    if (total === 0) {
      throw new Error("No order cards available in Packed tab to open detail.");
    }
    const firstCard = await this.getFirstOrderCard();
    await firstCard.waitFor({ state: "visible", timeout: 15000 });
    try {
      await firstCard.click({ timeout: 10000 });
    } catch (e) {
      // Ionic cards can have nested native button; fallback to force click.
      await firstCard.click({ force: true, timeout: 10000 });
    }
  }

  async openFirstHandoverReadyOrderDetail(maxCardsToTry = 8) {
    await this.waitForOverlays();
    await this.packedOrdersContainer.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    const total = await this.orderCards.count();
    const limit = Math.min(total, maxCardsToTry);

    for (let i = 0; i < limit; i++) {
      const card = this.orderCards.nth(i);
      const visible = await card.isVisible().catch(() => false);
      if (!visible) continue;

      const cardHandoverButton = card
        .getByTestId("handover-button")
        .or(card.getByTestId("handover-fab-button"))
        .or(card.getByRole("button", { name: /handover|ship/i }))
        .first();
      const hasHandover = await cardHandoverButton.isVisible().catch(() => false);
      if (!hasHandover) continue;

      await card.click();
      return true;
    }
    return false;
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
    if (/(blob|pdf)/.test(url)) {
      console.log(`Packing slip opened in new tab (List Page): ${url}`);
    } else {
      console.warn(`Packing slip popup opened with non-blob URL: ${url}`);
    }
  }
}
