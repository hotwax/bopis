import { expect } from "@playwright/test";

export class OrderPage {
  constructor(page) {
    this.page = page;
    // segement button
    this.openTabButton = page.getByTestId("open-segment-button");
    this.packedTabButton = page.getByTestId("packed-segment-button");
    this.completedTabButton = page.getByTestId("completed-segment-button");

    // Order Card
    this.orderCard = this.page.getByTestId("order-card");
    this.firstCard = this.orderCard.first();
    // Assign picker
    this.assignPickerModal = page.getByTestId("assign-picker-modal-header");
    this.assignPickerRadios = page.getByTestId("assign-picker-radio");
    this.assignPickerSaveButton = page.getByTestId("assign-picker-save-button");
    // Gift Card Elements
    this.giftCardModal = page.getByTestId("giftcard-activation-modal-header");
    this.giftCardActivationButton = page.getByTestId(
      "gift-card-activation-button",
    );
    this.giftCardInput = page.getByTestId("giftcard-activation-input");
    this.giftCardLabel = page.getByTestId("giftcard-activation-label");
    this.giftCardSaveButton = page.getByTestId(
      "giftcard-activation-save-button",
    );
    this.giftCardCloseButton = page.getByTestId(
      "giftcard-activation-close-button",
    );
    this.giftCardActivateButton = page.getByRole("button", {
      name: "Activate",
    });
    this.giftCardActivatedSuccess = this.page.getByText(
      "Gift card activated successfully.",
    );

    this.searchBar = this.page.locator('[data-testid="order-searchbar"] input');
    // toast
    this.orderDelivered = page.getByText(`Order delivered to`);
  }
  async goToOpenTab() {
    await this.openTabButton.waitFor({ state: "visible" });
    await this.openTabButton.click();
    await this.firstCard.waitFor({ state: "visible" });
  }
  async goToCompletedTab() {
    await this.completedTabButton.waitFor({ state: "visible" });
    await this.completedTabButton.click();
    await this.firstCard.waitFor({ state: "visible" });
  }
  async goToPackedTab() {
    await this.packedTabButton.waitFor({ state: "visible" });
    await this.packedTabButton.click();
    const firstPackedCard = this.orderCard.first();
    await firstPackedCard.waitFor({ state: "visible" });
  }
  async verifyAssignPickerModal() {
    await expect(this.assignPickerModal).toBeVisible();
  }

  async verifySuccessToast() {
    await expect(this.orderDelivered).toBeVisible();
  }

  async getFirstOrderCard() {
    return this.firstCard;
  }
  async clickFirstOrderCard() {
    const firstCard = await this.getFirstOrderCard();
    await firstCard.waitFor({ state: "visible" });
    await firstCard.click();
  }
  async pageGoback() {
    return this.page.goBack();
  }

  async getOrderName() {
    const card = await this.getFirstOrderCard();
    const label = card.getByTestId("order-name-tag");
    await expect(label).toBeVisible();
    const orderName = await label.textContent();
    if (!orderName) throw new Error("OrderName not Found");
    return orderName?.trim();
  }
  async findCardByOrderName(orderName) {
    const matchingCard = this.orderCard.filter({ hasText: orderName }).first();
    await expect(matchingCard).toBeVisible();
    return matchingCard;
  }

  async assignPickerAndSave(selectedIndex = 0) {
    await this.verifyAssignPickerModal();
    await expect(this.assignPickerRadios.nth(selectedIndex)).toBeVisible();
    await this.assignPickerRadios.nth(selectedIndex).click();
    await this.assignPickerSaveButton.click();
  }

  async handlePopupAndVerify() {
    const popupPromise = this.page.waitForEvent("popup").catch(() => null);
    const result = await Promise.race([popupPromise]);
    if (result && result.url()) {
      const url = result.url();
      expect(url).toMatch(/(blob|pdf)/);
      console.log(`Blob/PDF URL opened: ${url}`);
    } else {
      throw new Error("No blob/pdf detected after clicking.");
    }
  }
  async openFirstGiftCardOrder() {
    const giftCardOrders = this.orderCard.filter({
      has: this.giftCardActivationButton,
    });
    const firstCard = giftCardOrders.first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
  }

  async openFirstGiftCardModalFromList() {
    const giftCardOrders = this.orderCard.filter({
      has: this.page.getByTestId("gift-card-activation-button"),
    });
    const firstGiftCard = giftCardOrders.first();
    await expect(firstGiftCard).toBeVisible();

    const giftIcon = firstGiftCard
      .getByTestId("gift-card-activation-button")
      .first();
    await expect(giftIcon).toBeVisible();
    await giftIcon.click();

    await expect(this.giftCardModal).toBeVisible();
  }

  async activateGiftCard(code = "mygiftcard123") {
    await Promise.race([
      this.giftCardInput
        .first()
        .waitFor({ state: "visible", timeout: 2000 })
        .catch((err) => {
          console.warn(
            "Giftcard input not visible within timeout:",
            err.message,
          );
        }),
      this.giftCardLabel
        .first()
        .waitFor({ state: "visible", timeout: 2000 })
        .catch((err) => {
          console.warn(
            "Giftcard label not visible within timeout:",
            err.message,
          );
        }),
    ]);
    const hasInput = await this.giftCardInput.isVisible();
    const hasLabel = await this.giftCardLabel.isVisible();

    expect(hasInput || hasLabel).toBe(true);

    if (hasInput) {
      await this.giftCardInput.click();
      await this.giftCardInput.type(code);

      await expect(this.giftCardSaveButton).toBeVisible();
      await this.giftCardSaveButton.click();

      await expect(this.giftCardActivateButton).toBeVisible();
      await this.giftCardActivateButton.click();

      await expect(this.giftCardActivatedSuccess).toBeVisible();
    } else if (hasLabel) {
      await expect(this.giftCardCloseButton).toBeVisible();
      await this.giftCardCloseButton.click();
    } else {
      throw new Error("No input or label found in gift card modal");
    }
  }
  async bringToFront() {
    await this.page.bringToFront();
  }
  async searchByOrderName(orderName) {
    await expect(this.searchBar).toBeVisible();
    await this.searchBar.type(orderName);
    await this.page.keyboard.press("Enter");
    const resultCard = this.orderCard.filter({ hasText: orderName }).first();
    await expect(resultCard).toBeVisible();
    return resultCard;
  }
}
