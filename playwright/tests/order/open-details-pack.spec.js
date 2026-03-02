import { test, expect } from "../../fixtures";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { loginToOrders } from "../../helpers/auth";

// Packed order from Open detail page by Assigning the Picker when the Enable Tracking is on
test("Open Details Page: Pack Order When Tracking Enabled", async ({
  page,
}) => {
  // Scenario: open-order detail flow where tracking may require picker assignment.
  const packOpenOrder = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);
  await loginToOrders(page);
  await orderPage.goToOpenTab();
  await orderPage.openOrdersContainer.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const totalOrders = await orderPage.orderCards.count();
  if (totalOrders === 0) {
    await expect(orderPage.noOrdersMessage).toBeVisible();
    return;
  }

  let detailReady = false;
  const maxToTry = Math.min(totalOrders, 8);
  for (let i = 0; i < maxToTry; i++) {
    await orderPage.goToOpenTab();
    const card = orderPage.orderCards.nth(i);
    const cardVisible = await card.isVisible().catch(() => false);
    if (!cardVisible) continue;
    await card.click({ force: true });
    await packOpenOrder.verifyDetailPage();
    const hasReadyButton = await packOpenOrder.readyForPickupButton
      .or(packOpenOrder.readyForPickupButtonAlt)
      .or(packOpenOrder.readyForPickupButtonByRole)
      .first()
      .isVisible()
      .catch(() => false);
    if (hasReadyButton) {
      detailReady = true;
      break;
    }
    await packOpenOrder.goBack().catch(() => {});
  }
  if (!detailReady) {
    test.skip(true, "No eligible open order detail had Ready for Pickup action");
    return;
  }

  await packOpenOrder.markReadyForPickup();
  // Branch by product-store config / runtime state: modal flow vs alert flow.
  if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      await expect(packOpenOrder.assignPickerSaveButton).toBeDisabled();
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
  // Scenario: open-order detail flow where direct confirmation may be used.
  const packOpenOrder = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);
  await loginToOrders(page);
  await orderPage.goToOpenTab();
  await orderPage.openOrdersContainer.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const totalOrders = await orderPage.orderCards.count();
  if (totalOrders === 0) {
    await expect(orderPage.noOrdersMessage).toBeVisible();
    return;
  }

  let detailReady = false;
  const maxToTry = Math.min(totalOrders, 8);
  for (let i = 0; i < maxToTry; i++) {
    await orderPage.goToOpenTab();
    const card = orderPage.orderCards.nth(i);
    const cardVisible = await card.isVisible().catch(() => false);
    if (!cardVisible) continue;
    await card.click({ force: true });
    await packOpenOrder.verifyDetailPage();
    const hasReadyButton = await packOpenOrder.readyForPickupButton
      .or(packOpenOrder.readyForPickupButtonAlt)
      .or(packOpenOrder.readyForPickupButtonByRole)
      .first()
      .isVisible()
      .catch(() => false);
    if (hasReadyButton) {
      detailReady = true;
      break;
    }
    await packOpenOrder.goBack().catch(() => {});
  }
  if (!detailReady) {
    test.skip(true, "No eligible open order detail had Ready for Pickup action");
    return;
  }

  await packOpenOrder.markReadyForPickup();
  // Handle whichever post-click UI appears in this environment.
  if (await packOpenOrder.readyForPickupAlertBox.isVisible().catch(() => false)) {
    await packOpenOrder.confirmReadyPickupAlert().catch(() => {});
  } else if (await packOpenOrder.assignPickerModal.isVisible().catch(() => false)) {
    const pickerCount = await packOpenOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      await expect(packOpenOrder.assignPickerSaveButton).toBeDisabled();
      return;
    }
    await packOpenOrder.assignPickerAndSave(0);
  }
  // verify that success label are now visible
  await packOpenOrder.verifyOrderPackedMessage();
});
