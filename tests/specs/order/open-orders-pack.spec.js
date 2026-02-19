import { test } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";

// Pack order from list page when Tracking is  Enabled
test("Open Orders Page: Pack Order When Tracking Enabled", async ({ page }) => {
  // Scenario: list-page pack action where picker modal or alert can appear.
  const orderPage = new OrderPage(page);
  const packOpenOrder = new OpenOrderPage(page);
  await orderPage.goToOpenTab();
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  if (!(await packOpenOrder.readyForPickupButton.isVisible().catch(() => false))) {
    test.skip(true, "Ready for Pickup button not available on first open order");
    return;
  }
  await packOpenOrder.markReadyForPickup();
  // Handle both tracking-enabled (picker modal) and alert confirmation variants.
  if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      test.skip(true, "No pickers available in assign picker modal");
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

  const packOpenOrder = new OpenOrderPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToOpenTab();
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  if (!(await packOpenOrder.readyForPickupButton.isVisible().catch(() => false))) {
    test.skip(true, "Ready for Pickup button not available on first open order");
    return;
  }
  await packOpenOrder.markReadyForPickup();
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
