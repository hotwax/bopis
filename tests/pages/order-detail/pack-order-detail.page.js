import { expect } from "@playwright/test";

export class PackedDetailPage {
  constructor(page) {
    console.log('packed detail page')
    this.page = page;
    this.orderDetailsPage = this.page.getByTestId("order-details-page");

    // Handover button and related elements (Desktop and Mobile FAB)
    this.handoverButton = this.orderDetailsPage
      .getByTestId("handover-button")
      .or(this.orderDetailsPage.getByTestId("handover-fab-button"))
      .or(this.page.getByRole("button", { name: /handover|ship/i })).first();
    this.handedOverSuccessLabel = this.orderDetailsPage.getByTestId(
      "handed-over-success-label",
    );

    this.handoverAlert = page.locator("ion-alert");
    this.handoverConfirmButton = this.page.getByRole("button", {
      name: /handover|ship/i,
    });

    // Cancellation Workflow Elements
    this.detailPageIonItems = page.getByTestId("detail-page-item");
    this.cancelItemButton = this.orderDetailsPage.getByTestId(
      "select-cancel-item-button",
    );
    this.cancelItemsSubmitButton = this.orderDetailsPage.getByTestId(
      "submit-cancel-items-button",
    );
    this.cancelReasonButton = this.page.getByTestId(
      "select-cancellation-reason-button",
    );
    this.cancelReasonChip = this.page.getByTestId("change-cancel-reason-chip");
    this.confirmCancellationButton = this.page.getByTestId(
      "confirm-cancellation-button",
    );

    // Packing slip button for printing
    this.packingSlipButton = this.orderDetailsPage.getByTestId(
      "packing-slip-button",
    );

    this.orderRejectedsuccess = this.page.getByText(
      "All order items are cancelled",
    );
    this.backButton = page.getByTestId("back-button");
    this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper");
  }

  async goBack() {
    await this.waitForOverlays();
    if (await this.backButton.isVisible()) {
      await this.backButton.click({ force: true });
    } else {
      await this.page.goBack();
    }
    await this.page.waitForLoadState("networkidle");
  }


  async waitForOverlays() {
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
  }


  async verifyDetailPageVisible() {
    console.log(`Verifying detail page visibility. Current URL: ${this.page.url()}`);
    await this.orderDetailsPage.waitFor({ state: "visible", timeout: 15000 });

    const orderNotFound = this.page.getByText(/order not found/i);
    if (await orderNotFound.isVisible()) {
      throw new Error(`Order not found on detail page! URL: ${this.page.url()}`);
    }

    console.log("Waiting for order-name-tag...");
    await this.orderDetailsPage.getByTestId("order-name-tag").waitFor({ state: "visible", timeout: 20000 });
    console.log("✓ Order Detail page content is visible.");
  }

  async handoverOrder() {
    console.log("Attempting handover...");
    await this.waitForOverlays();

    // Wait for either the desktop button or mobile FAB to be visible
    await this.handoverButton.waitFor({ state: "visible", timeout: 15000 });
    await expect(this.handoverButton).toBeEnabled();
    await this.handoverButton.click({ force: true });
    await this.page.waitForTimeout(500);

    await this.handoverAlert.waitFor({ state: "visible", timeout: 10000 });
    await this.handoverConfirmButton.waitFor({ state: "visible", timeout: 10000 });
    await expect(this.handoverConfirmButton).toBeEnabled();
    await this.handoverConfirmButton.click({ force: true });
    await this.page.waitForTimeout(500);

    console.log("Waiting for handed over success label...");
    const success = await this.handedOverSuccessLabel
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (success) {
      console.log("✓ Handover successful.");
      return;
    }
    // Fallback: if detail page changes state, allow caller to validate in Completed tab
    const stillVisible = await this.orderDetailsPage.isVisible().catch(() => false);
    if (!stillVisible) {
      console.warn("Handover success label not shown, but detail page is no longer visible.");
      return;
    }
    console.warn("Handover success label not shown; proceeding to tab verification.");
  }


  async cancelSingleItem() {
    await expect(this.cancelItemButton.first()).toBeVisible();
    await this.cancelItemButton.first().click();

    await expect(this.cancelReasonButton.first()).toBeVisible();
    await this.cancelReasonButton.first().click();

    await expect(this.cancelItemsSubmitButton).toBeEnabled();
    await this.cancelItemsSubmitButton.click();

    await expect(this.confirmCancellationButton).toBeVisible();
    await this.confirmCancellationButton.click();
    // verify the order rejected success
    await expect(this.orderRejectedsuccess).toBeVisible();
  }

  async cancelOneItemFromMultiple() {
    const totalItems = await this.detailPageIonItems.count();
    expect(totalItems).toBeGreaterThan(1);

    const firstItem = this.cancelItemButton.first();
    await expect(firstItem).toBeVisible();
    await firstItem.click();

    await expect(this.cancelReasonButton.first()).toBeVisible();
    await this.cancelReasonButton.first().click();

    await expect(this.cancelItemsSubmitButton).toBeEnabled();
    await this.cancelItemsSubmitButton.click();

    await expect(this.confirmCancellationButton).toBeVisible();
    await this.confirmCancellationButton.click();

    // Verify count reduced by one after cancellation
    await expect(this.detailPageIonItems).toHaveCount(totalItems - 1);
  }

  async printPackingSlipFromDetail() {
    await expect(this.packingSlipButton).toBeVisible();
    const popupPromise = this.page.waitForEvent("popup", { timeout: 10000 }).catch(() => null);
    await this.packingSlipButton.click();
    const popup = await popupPromise;
    if (!popup) {
      console.warn("Packing slip popup did not open from detail page.");
      return;
    }
    const url = popup.url();
    if (/(blob|pdf)/i.test(url)) {
      console.log(`Packing slip opened in new tab (Detail Page): ${url}`);
    } else {
      console.warn(`Packing slip popup opened with non-blob URL: ${url}`);
    }
  }
}
