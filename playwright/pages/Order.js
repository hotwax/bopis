import { expect } from "@playwright/test";

export class BopisOrdersPage {
  constructor(page) {
    this.page = page;
  }

  async goToOpenTab() {
    const tabButton = await this.page.getByTestId("open-segment-button");
    await expect(tabButton).toBeVisible();
    await tabButton.click();
    // Wait for order cards to appear
    const firstCard = this.page.getByTestId("order-card").first();
    await expect(firstCard).toBeVisible();
  }

  async goToPackedTab() {
    const tabButton = this.page.getByTestId("packed-segment-button");
    await expect(tabButton).toBeVisible();
    await tabButton.click();
    const firstCard = this.page.getByTestId("order-card").first();
    await expect(firstCard).toBeVisible();
  }

  async goToCompletedTab() {
    const tabButton = this.page.getByTestId("completed-segment-button");
    await expect(tabButton).toBeVisible();
    await tabButton.click();
    const firstCard = this.page.getByTestId("order-card").first();
    await expect(firstCard).toBeVisible();
  }

  async getFirstOrderCard() {
    return this.page.getByTestId("order-card").first();
  }

  async findCardByOrderName(orderName) {
    const cards = this.page.getByTestId("order-card");
    const matchingCard = cards.filter({ hasText: orderName }).first();
    await expect(matchingCard).toBeVisible();
    return matchingCard;
  }

  async getOrderTextFromCard(card) {
    const label = card.getByTestId("order-name-tag");
    await expect(label).toBeVisible();
    const text = await label.textContent();
    return text?.trim() || null;
  }

  async clickReadyForPickup(card) {
    const button = card.getByTestId("ready-pickup-button");
    await expect(button).toBeVisible();
    await button.click();
  }

  async clickHandover(card) {
    const button = card.getByTestId("handover-button");
    await expect(button).toBeVisible();
    await button.click();
  }

  // Click appropriate button based on tab
  async clickActionButtonForTab(tab) {
    const card = await this.getFirstOrderCard();
    if (tab === "open") {
      // Ready for Pickup button must exist on Open tab
      await this.clickReadyForPickup(card);
    } else if (tab === "packed") {
      // Handover button must exist on Packed tab
      await this.clickHandover(card);
    } else if (tab === "completed") {
      // Neither button should exist on Completed tab
      const readyForPickupButton = card.getByTestId("ready-pickup-button");
      const handoverButton = card.getByTestId("handover-button");
      await expect(readyForPickupButton).toHaveCount(0);
      await expect(handoverButton).toHaveCount(0);
    } else {
      throw new Error("Unknown tab:", tab);
    }
  }

  async clickFirstOrderCard() {
    const firstCard = await this.getFirstOrderCard();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
  }

  async expectEnabled(testId, nth = 0) {
    await expect(this.page.getByTestId(testId).nth(nth)).toBeEnabled();
  }

  async clickByTestId(testId, nth = 0, page1 = this.page) {
    const element = await page1.getByTestId(testId).nth(nth);
    await expect(element).toBeVisible();
    await element.click();
  }

  async verifyTextExists(text, parentSelector = this.page) {
    const textElement = parentSelector.getByText(text);
    await expect(textElement).toBeVisible();
  }

  async clickByRole(role, name, nth = 0, parentSelector = this.page) {
    const element = parentSelector.getByRole(role, { name }).nth(nth);
    await expect(element).toBeVisible();
    await element.click();
  }

  async pickerModal(selectedIndex) {
    const pickerModal = await this.page.getByTestId(
      "assign-picker-modal-header",
    );
    await expect(pickerModal).toBeVisible();
    try {
      await this.clickByTestId("assign-picker-radio", selectedIndex);
      await this.clickByTestId("assign-picker-save-button");
    } catch (error) {
      console.error(`Something went wrong: ${error.message}`);
    }
  }
}
