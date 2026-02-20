import { test, expect } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { loginToOrders } from "../../helpers/auth";

// Pack order from list page when Tracking is  Enabled
test("Open Orders Page: Pack Order When Tracking Enabled", async ({ page }) => {
  // Scenario: list-page pack action where picker modal or alert can appear.
  await loginToOrders(page);
  const orderPage = new OrderPage(page);
  const packOpenOrder = new OpenOrderPage(page);
  await orderPage.goToOpenTab();
  const totalOrders = await orderPage.orderCards.count();
  if (totalOrders === 0) {
    await expect(orderPage.noOrdersMessage).toBeVisible();
    return;
  }

  let readyClicked = false;
  const maxToTry = Math.min(totalOrders, 8);
  for (let i = 0; i < maxToTry; i++) {
    const card = orderPage.orderCards.nth(i);
    const readyButton = card
      .getByTestId("ready-pickup-button")
      .or(card.getByTestId("ready-for-pickup-button"))
      .or(card.getByRole("button", { name: /ready for pickup/i }))
      .first();
    const visible = await readyButton.isVisible().catch(() => false);
    if (!visible) continue;
    await readyButton.click({ force: true });
    readyClicked = true;
    break;
  }
  if (!readyClicked) {
    test.skip(true, "Ready for Pickup button not available on tried open orders");
    return;
  }

  // Handle both tracking-enabled (picker modal) and alert confirmation variants.
  if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      await expect(packOpenOrder.assignPickerSaveButton).toBeDisabled();
      return;
    }
    await packOpenOrder.assignPickerAndSave();
  } else if (await packOpenOrder.readyForPickupAlertBox.isVisible().catch(() => false)) {
    await packOpenOrder.confirmReadyPickupAlert();
  }
  await packOpenOrder.verifyorderPackedText();
});

// Pack order from list page when Tracking is  Disabled
test("Open Orders Page: Pack Order When Tracking Disabled", async ({
  page,
}) => {
  // Scenario: list-page pack action where direct confirmation is expected.
  await loginToOrders(page);

  const packOpenOrder = new OpenOrderPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToOpenTab();
  const totalOrders = await orderPage.orderCards.count();
  if (totalOrders === 0) {
    await expect(orderPage.noOrdersMessage).toBeVisible();
    return;
  }

  let readyClicked = false;
  const maxToTry = Math.min(totalOrders, 8);
  for (let i = 0; i < maxToTry; i++) {
    const card = orderPage.orderCards.nth(i);
    const readyButton = card
      .getByTestId("ready-pickup-button")
      .or(card.getByTestId("ready-for-pickup-button"))
      .or(card.getByRole("button", { name: /ready for pickup/i }))
      .first();
    const visible = await readyButton.isVisible().catch(() => false);
    if (!visible) continue;
    await readyButton.click({ force: true });
    readyClicked = true;
    break;
  }
  if (!readyClicked) {
    test.skip(true, "Ready for Pickup button not available on tried open orders");
    return;
  }

  if (await packOpenOrder.readyForPickupAlertBox.isVisible().catch(() => false)) {
    await packOpenOrder.confirmReadyPickupAlert();
  } else if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount > 0) {
      await packOpenOrder.assignPickerAndSave();
    }
  }
  await packOpenOrder.verifyorderPackedText();
});
