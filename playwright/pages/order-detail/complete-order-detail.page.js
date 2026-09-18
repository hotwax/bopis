import { expect } from "@playwright/test";

export class CompleteDetailPage {
  constructor(page) {
    this.page = page;
    // Locators
    this.completedTabButton = page.getByTestId("completed-segment-button");
  }

  async goToCompletedTab() {
    await expect(this.completedTabButton).toBeVisible();
    await this.completedTabButton.click();
  }
}
