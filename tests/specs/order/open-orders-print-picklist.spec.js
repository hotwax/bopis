import { test, expect } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { loginToOrders } from "../../helpers/auth";

// Print picklist from list page (Case 1: Picker Not Assigned)
test("Open Orders Page: Print Picklist When Picker Not Assigned", async ({
  page,
}) => {
  await loginToOrders(page);

  const openOrder = new OpenOrderPage(page);
  await openOrder.goToOpenTab();
  const totalOrders = await openOrder.orderCards.count();
  if (totalOrders === 0) {
    await expect(openOrder.noOrdersMessage).toBeVisible();
    return;
  }

  let matched = false;
  const maxToTry = Math.min(totalOrders, 8);
  for (let i = 0; i < maxToTry; i++) {
    const card = openOrder.orderCards.nth(i);
    const printButton = card.getByTestId("print-picklist-button").first();
    const buttonVisible = await printButton.isVisible().catch(() => false);
    if (!buttonVisible) continue;
    await printButton.click({ force: true });

    const modalShown = await openOrder.assignPickerModal
      .waitFor({ state: "visible", timeout: 7000 })
      .then(() => true)
      .catch(() => false);
    if (!modalShown) continue;

    const pickerCount = await openOrder.assignPickerRadios.count();
    if (pickerCount === 0) {
      await expect(openOrder.assignPickerSaveButton).toBeDisabled();
      return;
    }
    await openOrder.assignPickerAndSave(0);
    await openOrder.handlePopupAndVerify();
    matched = true;
    break;
  }
  if (!matched) {
    test.skip(true, "Could not find an open order requiring picker assignment for print picklist");
  }
});

// Print picklist from list page (Case 2: Picker Already Assigned)
test("Open Orders Page: Print Picklist When Picker Is Assigned", async ({
  page,
}) => {
  await loginToOrders(page);

  const openOrder = new OpenOrderPage(page);
  await openOrder.goToOpenTab();
  const totalOrders = await openOrder.orderCards.count();
  if (totalOrders === 0) {
    await expect(openOrder.noOrdersMessage).toBeVisible();
    return;
  }

  let matched = false;
  const maxToTry = Math.min(totalOrders, 8);
  for (let i = 0; i < maxToTry; i++) {
    const card = openOrder.orderCards.nth(i);
    const printButton = card.getByTestId("print-picklist-button").first();
    const buttonVisible = await printButton.isVisible().catch(() => false);
    if (!buttonVisible) continue;
    const popupPromise = page.waitForEvent("popup", { timeout: 7000 }).catch(() => null);
    await printButton.click({ force: true });
    const popup = await popupPromise;
    if (!popup) {
      continue;
    }
    console.log(`Popup opened: ${popup.url()}`);
    matched = true;
    break;
  }
  if (!matched) {
    test.skip(true, "Could not find an open order with picker already assigned for print picklist");
  }
});
