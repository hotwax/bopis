import { expect } from "@playwright/test";

export class OrderDetailPage {
  constructor(page) {
    this.page = page;

    this.orderDetailsPage = page.getByTestId("order-details-page");
    this.orderNameTag = this.orderDetailsPage.getByTestId("order-name-tag");

    this.editPickerChip = this.orderDetailsPage.getByTestId("edit-picker-chip");
    this.editPickerModalHeader = page.getByTestId("edit-picker-modal-header");
    this.editPickerRadios = page.getByTestId("edit-picker-radio");
    this.editPickerSaveButton = page.getByTestId("edit-picker-save-button");
    this.replaceButton = page.getByRole("button", { name: /replace/i });


    // Gift Card Elements
    this.giftCardActivationButton = this.orderDetailsPage.getByTestId(
      "gift-card-activation-button",
    );
    this.giftCardModal = page.getByTestId("giftcard-activation-modal-header");
    this.giftCardInput = page.getByTestId("giftcard-activation-input");
    this.giftCardLabel = page.getByTestId("giftcard-activation-label");
    this.giftCardSaveButton = page.getByTestId(
      "giftcard-activation-save-button",
    );
    this.giftCardCloseButton = page.getByTestId(
      "giftcard-activation-close-button",
    );
    this.giftCardActivateButton = page.getByRole("button", {
      name: /activate/i,
    });


    this.replacedPickerSuccess = this.page.getByText(/pickers successfully replaced/i);
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper, .modal-wrapper");
  }

  async waitForOverlays() {
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
  }


  async verifyDetailPage() {
    await this.orderDetailsPage.waitFor({ state: "visible" });
  }

  async getOrderName() {
    await this.orderNameTag.waitFor({ state: "visible" });
    const text = await this.orderNameTag.textContent();
    if (!text) throw new Error("Order name not found");
    return text.trim();
  }

  async openEditPickerModal() {
    await expect(this.editPickerChip).toBeVisible();
    await this.editPickerChip.click();
    await expect(this.editPickerModalHeader).toBeVisible();
  }

  async selectDifferentPicker() {
    const selectedIndex = await this.editPickerRadios.evaluateAll((radios) => {
      return radios.findIndex((radio) => !radio.checked);
    });
    await expect(this.editPickerRadios.nth(selectedIndex)).toBeVisible();
    await this.editPickerRadios.nth(selectedIndex).click();
  }

  async saveEditPicker() {
    await this.editPickerSaveButton.click();
    await expect(this.replaceButton).toBeVisible();
    await this.replaceButton.click();
  }

  async verifyPickerReplacedToast() {
    await expect(this.replacedPickerSuccess).toBeVisible();
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
  // Gift Card Flows
  async openGiftCardModal() {
    await expect(this.giftCardActivationButton.first()).toBeVisible();
    await this.giftCardActivationButton.first().click();
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

      await expect(
        this.page.getByText("Gift card activated successfully."),
      ).toBeVisible();
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
}
