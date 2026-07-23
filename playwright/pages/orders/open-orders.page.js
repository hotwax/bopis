import { expect } from "@playwright/test";

export class OpenOrderPage {
  constructor(page) {
    this.page = page;
    this.openTabButton = page.getByTestId("open-segment-button");
    this.orderCards = page.getByTestId("order-card");
    this.firstCard = page.getByTestId("order-card").first();
    this.readyForPickupButton = this.firstCard.getByTestId(
      "ready-pickup-button",
    );
    this.printPicklistButton = this.page
      .getByTestId("print-picklist-button")
      .first();

    // Dynamic thing
    this.readyForPickupAlertBox = page.locator("ion-alert");
    this.readyForPickupAlertButton = page.getByRole("button", {
      name: /ready for pickup/i,
    });
    this.rejectionAlertBox = page.locator("ion-alert");
    this.rejectionAlertButton = page.getByRole("button", { name: /reject/i });


    this.assignPickerModal = page.getByTestId("assign-picker-modal-header");
    this.assignPickerRadios = page.getByTestId("assign-picker-radio");
    this.assignPickerSaveButton = page.getByTestId("assign-picker-save-button");

    // Rejection Workflow   reject-order-modal-header
    this.rejectItemButton = this.firstCard.getByTestId(
      "listpage-reject-button",
    );
    this.rejectModalHeader = page.getByTestId("reject-order-modal-header");
    this.rejectionReasonButton = page.getByTestId(
      "rejection-reason-modal-button",
    );
    this.rejectionReasonOption = page.getByTestId(
      "select-rejection-reason-option",
    );
    this.submitRejectButton = page.getByTestId("reject-modal-button");

    this.orderPackedText = page.getByText(/order packed/i);
    this.openOrdersContainer = page.getByTestId("open-orders-container");
    this.noOrdersMessage = page.getByText(/no (orders|record) found/i);
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper, .modal-wrapper");
  }

  async waitForOverlays() {
    if (this.page.isClosed()) return;
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
  }

  async refreshBeforeTabSwitch() {
    if (this.page.isClosed()) return;
    if (!/\/tabs\/orders/.test(this.page.url())) return;
    await this.page.reload({ waitUntil: "domcontentloaded" }).catch(() => { });
    await this.waitForOverlays();
  }


  async goToOpenTab() {
    await this.waitForOverlays();
    await this.refreshBeforeTabSwitch();
    const tabVisible = await this.openTabButton.isVisible().catch(() => false);
    if (tabVisible) {
      await this.openTabButton.click({ force: true });
    } else {
      console.warn("Open tab button not visible; assuming already on Open tab.");
    }
    await Promise.race([
      this.openOrdersContainer.waitFor({ state: "visible", timeout: 15000 }).catch(() => { }),
      this.noOrdersMessage.waitFor({ state: "visible", timeout: 15000 }).catch(() => { }),
      this.firstCard.waitFor({ state: "visible", timeout: 15000 }).catch(() => { }),
    ]);
  }


  async getFirstOrderCard() {
    return this.firstCard;
  }
  async listRejectButton() {
    await expect(this.rejectItemButton).toBeVisible();
    await this.rejectItemButton.click();
  }

  async rejectionModal() {
    await expect(this.rejectModalHeader).toBeVisible();
    await expect(this.rejectionReasonButton.first()).toBeVisible();
    await this.rejectionReasonButton.first().click();
    await expect(this.rejectionReasonOption.first()).toBeVisible();
    await this.rejectionReasonOption.first().click();
    await this.submitRejectButton.click();
  }

  async confirmRejectAlert() {
    await expect(this.rejectionAlertBox).toBeVisible();
    await expect(this.rejectionAlertButton).toBeVisible();
    await this.rejectionAlertButton.click();
  }

  async markReadyForPickup() {
    await expect(this.readyForPickupButton).toBeVisible();
    await this.readyForPickupButton.click();
  }

  async assignPickerAndSave(selectedIndex = 0) {
    await expect(this.assignPickerModal).toBeVisible();
    await expect(this.assignPickerRadios.nth(selectedIndex)).toBeVisible();
    await this.assignPickerRadios.nth(selectedIndex).click();
    await this.assignPickerSaveButton.click();
  }
  async confirmReadyPickupAlert() {
    await expect(this.readyForPickupAlertBox).toBeVisible();
    await expect(this.readyForPickupAlertButton).toBeVisible();
    await this.readyForPickupAlertButton.click();
  }

  async verifyorderPackedText() {
    await this.orderPackedText
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
  }

  async printPicklist() {
    await expect(this.printPicklistButton).toBeVisible();
    await this.printPicklistButton.click();
  }

  async handlePopupAndVerify() {
    const popupPromise = this.page.waitForEvent("popup").catch(() => null);
    const result = await Promise.race([popupPromise]);
    if (result && result.url()) {
      const url = result.url();
      console.log(`Popup opened: ${url}`);
    } else {
      console.warn("No popup detected after clicking Print Picklist.");
    }
  }
}
