import { test } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";

// Print picklist from list page (Case 1: Picker Not Assigned)
test("Open Orders Page: Print Picklist When Picker Not Assigned", async ({
  page,
}) => {
  const openOrder = new OpenOrderPage(page);
  await openOrder.goToOpenTab();
  if (await openOrder.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  if (!(await openOrder.printPicklistButton.isVisible().catch(() => false))) {
    test.skip(true, "Print Picklist button not available");
    return;
  }
  await openOrder.printPicklist();
  if ((await openOrder.assignPickerRadios.count()) === 0) {
    test.skip(true, "No pickers available for assignment");
    return;
  }
  await openOrder.assignPickerAndSave(0);
  await openOrder.handlePopupAndVerify();
});

// Print picklist from list page (Case 2: Picker Already Assigned)
test("Open Orders Page: Print Picklist When Picker Is Assigned", async ({
  page,
}) => {
  const openOrder = new OpenOrderPage(page);
  await openOrder.goToOpenTab();
  if (await openOrder.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  if (!(await openOrder.printPicklistButton.isVisible().catch(() => false))) {
    test.skip(true, "Print Picklist button not available");
    return;
  }
  await openOrder.printPicklist();
  await openOrder.handlePopupAndVerify();
});
