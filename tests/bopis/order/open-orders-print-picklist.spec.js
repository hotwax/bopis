import { test } from "../../fixtures";
import { OpenOrderPage } from "../pages/orders/open-orders.page";

// Print picklist from list page (Case 1: Picker Not Assigned)
test("Open Orders Page: Print Picklist When Picker Not Assigned", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const openOrder = new OpenOrderPage(page);
  await openOrder.goToOpenTab();
  await openOrder.printPicklist();
  await openOrder.assignPickerAndSave(0);
  await openOrder.handlePopupAndVerify();
});

// Print picklist from list page (Case 2: Picker Already Assigned)
test("Open Orders Page: Print Picklist When Picker Is Assigned", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const openOrder = new OpenOrderPage(page);
  await openOrder.goToOpenTab();
  await openOrder.printPicklist();
  await openOrder.handlePopupAndVerify();
});
