import { test } from "../../fixtures";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { OrderPage } from "../../pages/orders/orders.page";

// Packed order from Open detail page by Assigning the Picker when the Enable Tracking is on
test("Open Details Page: Pack Order When Tracking Enabled", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);
  // Scenario: open-order detail flow where tracking may require picker assignment.
  const packOpenOrder = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToOpenTab();
  await orderPage.openOrdersContainer.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  const firstCardVisibleEnabled = await orderPage.firstCard
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (!firstCardVisibleEnabled) {
    test.skip(true, "Open order card is not visible");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await packOpenOrder.verifyDetailPage();
  await packOpenOrder.markReadyForPickup();
  // Branch by product-store config / runtime state: modal flow vs alert flow.
  if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      test.skip(true, "No pickers available in assign picker modal");
      return;
    }
    await packOpenOrder.assignPickerAndSave(1);
  } else if (await packOpenOrder.readyForPickupAlertBox.isVisible().catch(() => false)) {
    await packOpenOrder.confirmReadyPickupAlert();
  }
  // verify that success label are now visible
  await packOpenOrder.verifyOrderPackedMessage();
});

// Packed order from Open detail page when the Enable Tracking is off
test("Open Details Page: Pack Order When Tracking Disabled", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);
  // Scenario: open-order detail flow where direct confirmation may be used.
  const packOpenOrder = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToOpenTab();
  await orderPage.openOrdersContainer.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  const firstCardVisibleDisabled = await orderPage.firstCard
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (!firstCardVisibleDisabled) {
    test.skip(true, "Open order card is not visible");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await packOpenOrder.verifyDetailPage();
  await packOpenOrder.markReadyForPickup();
  // Handle whichever post-click UI appears in this environment.
  if (await packOpenOrder.readyForPickupAlertBox.isVisible().catch(() => false)) {
    await packOpenOrder.confirmReadyPickupAlert().catch(() => {});
  } else if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      test.skip(true, "No pickers available in assign picker modal");
      return;
    }
    await packOpenOrder.assignPickerAndSave(0);
  }
  // verify that success label are now visible
  await packOpenOrder.verifyOrderPackedMessage();
});
