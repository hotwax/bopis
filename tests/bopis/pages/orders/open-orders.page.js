import { expect } from "@playwright/test";

export class OpenOrderPage {
  constructor(page) {
    this.page = page;
    this.openTabButton = page.getByTestId("open-segment-button");
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
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper, .modal-wrapper");
  }

  async waitForOverlays() {
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
  }


  async goToOpenTab() {
    await this.waitForOverlays();
    await this.openTabButton.waitFor({ state: "visible" });
    await this.openTabButton.click({ force: true });
    // Wait for the first card to be visible to ensure the tab content has loaded
    await this.firstCard.waitFor({ state: "visible" }).catch(() => { });
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
    await expect(this.orderPackedText).toBeVisible();
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
      expect(url).toMatch(/(blob|pdf)/);
      console.log(`Blob URL opened in new tab: ${url}`);
    } else {
      throw new Error("No blob URL detected after clicking Print Picklist.");
    }
  }
}
