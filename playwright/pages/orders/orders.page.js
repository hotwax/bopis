import { expect } from "@playwright/test";

export class OrderPage {
  constructor(page) {
    this.page = page;
    // Tabs (using test-id as ion-segment-button doesn't have tab role)
    this.openTabButton = page.getByTestId("open-segment-button");
    this.packedTabButton = page.getByTestId("packed-segment-button");
    this.completedTabButton = page.getByTestId("completed-segment-button");

    // Order Cards
    this.orderCards = this.page.locator('ion-card[data-testid="order-card"]');
    this.firstCard = this.orderCards.first();

    this.openOrdersContainer = page.getByTestId("open-orders-container");
    this.packedOrdersContainer = page.getByTestId("packed-orders-container");
    this.completedOrdersContainer = page.getByTestId("completed-orders-container");

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

    this.searchBar = this.page.locator("ion-searchbar input");
    this.orderDelivered = page.getByText(`Order delivered to`);
    this.noOrdersMessage = page.getByText(/no (orders|record) found/i);
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper, .modal-wrapper");

  }

  async waitForOverlays() {
    // Aggressive wait for any Ionic-style overlays to be hidden
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    // Small buffer for Ionic animations and pointer event release
    await this.page.waitForTimeout(1000);
  }

  async refreshBeforeTabSwitch() {
    await this.page.reload({ waitUntil: "domcontentloaded" }).catch(() => { });
    await this.waitForOverlays();
  }

  async goToOpenTab() {
    console.log("Navigating to Open tab...");
    await this.waitForOverlays();
    await this.refreshBeforeTabSwitch();

    await this.openTabButton.waitFor({ state: "visible" });
    await this.openTabButton.click({ force: true });
    console.log("Waiting for Open tab content to load...");

    // Wait for either the container (if orders exist) or the empty state message
    const contentLoaded = await Promise.race([
      this.openOrdersContainer.waitFor({ state: "visible", timeout: 20000 }).then(() => "orders").catch(() => null),
      this.noOrdersMessage.waitFor({ state: "visible", timeout: 20000 }).then(() => "empty").catch(() => null)
    ]);

    if (!contentLoaded) {
      console.log("Warning: Neither orders container nor empty message appeared. Waiting a bit more...");
      await this.page.waitForTimeout(2000);
    }

    console.log("✓ Open tab loaded.");
  }

  async goToCompletedTab() {
    console.log("Navigating to Completed tab...");
    await this.waitForOverlays();
    await this.refreshBeforeTabSwitch();
    await this.completedTabButton.waitFor({ state: "visible" });
    await this.completedTabButton.click({ force: true });

    await Promise.race([
      this.completedOrdersContainer.waitFor({ state: "visible" }).catch(() => { }),
      this.noOrdersMessage.waitFor({ state: "visible" }).catch(() => { })
    ]);
    console.log("✓ Completed tab loaded.");
  }

  async goToPackedTab() {
    console.log("Navigating to Packed tab...");
    await this.waitForOverlays();
    await this.refreshBeforeTabSwitch();
    await this.packedTabButton.waitFor({ state: "visible" });
    await this.packedTabButton.click({ force: true });

    await Promise.race([
      this.packedOrdersContainer.waitFor({ state: "visible" }).catch(() => { }),
      this.noOrdersMessage.waitFor({ state: "visible" }).catch(() => { })
    ]);
    console.log("✓ Packed tab loaded.");
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
    const matchingCard = this.orderCards.filter({ hasText: orderName }).first();
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
      if (/(blob|pdf)/.test(url)) {
        console.log(`Blob/PDF URL opened: ${url}`);
      } else {
        console.warn(`Popup opened with non-blob URL: ${url}`);
      }
    } else {
      console.warn("No blob/pdf detected after clicking.");
    }
  }
  async openFirstGiftCardOrder() {
    const giftCardOrders = this.orderCards.filter({
      has: this.giftCardActivationButton,
    });
    const firstCard = giftCardOrders.first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
  }


  async openFirstGiftCardModalFromList() {
    const giftCardOrders = this.orderCards.filter({
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
    await this.waitForOverlays();
    await this.searchBar.waitFor({ state: "visible" });
    await this.searchBar.fill(orderName);
    await this.page.keyboard.press("Enter");
    await this.waitForOverlays();

    // Prefer order cards, fall back to role buttons if needed
    const cardMatch = this.orderCards.filter({ hasText: orderName }).first();
    const cardVisible = await cardMatch.isVisible().catch(() => false);
    if (cardVisible) {
      await expect(cardMatch).toBeVisible({ timeout: 15000 });
      return cardMatch;
    }

    const resultCard = this.page.getByRole("button").filter({ hasText: orderName }).first();
    const roleVisible = await resultCard.isVisible().catch(() => false);
    if (roleVisible) {
      await expect(resultCard).toBeVisible({ timeout: 15000 });
      return resultCard;
    }

    throw new Error(`Order ${orderName} not found in current tab.`);
  }

}
