import { expect } from "@playwright/test";

export class PackedDetailPage {
  constructor(page) {
    this.page = page;
    this.orderDetailsPage = this.page.getByTestId("order-details-page");

    // Handover button and related elements
    this.handoverButton = this.orderDetailsPage.getByTestId("handover-button");
    this.handedOverSuccessLabel = this.orderDetailsPage.getByTestId(
      "handed-over-success-label",
    );

    this.handoverAlert = page.locator("ion-alert");
    this.handoverConfirmButton = this.page.getByRole("button", {
      name: "Handover",
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
    await this.orderDetailsPage.waitFor({ state: "visible" });
  }

  async handoverOrder() {
    console.log("Attempting handover...");
    await this.waitForOverlays();
    await this.handoverButton.waitFor({ state: "visible" });
    await this.handoverButton.click({ force: true });

    await this.handoverAlert.waitFor({ state: "visible" });
    await this.handoverConfirmButton.waitFor({ state: "visible" });
    await this.handoverConfirmButton.click({ force: true });

    console.log("Waiting for handed over success label...");
    await this.handedOverSuccessLabel.waitFor({ state: "visible" });
    console.log("✓ Handover successful.");
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
    const [popup] = await Promise.all([
      this.page.waitForEvent("popup"),
      this.packingSlipButton.click(),
    ]);
    const url = popup.url();
    expect(url).toMatch(/(blob|pdf)/);
    console.log(`Packing slip opeed in new tab: ${url}`);
  }
}
