import { test } from "../../fixtures";
import { OpenOrderPage } from "../pages/orders/open-orders.page";
import { OrderPage } from "../pages/orders/orders.page";

// Pack order from list page when Tracking is  Enabled
test("Open Orders Page: Pack Order When Tracking Enabled", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);
  const orderPage = new OrderPage(page);
  const packOpenOrder = new OpenOrderPage(page);
  await orderPage.goToOpenTab();
  await packOpenOrder.markReadyForPickup();
  await packOpenOrder.assignPickerAndSave();
  await packOpenOrder.verifyorderPackedText();
});

// Pack order from list page when Tracking is  Disabled
test("Open Orders Page: Pack Order When Tracking Disabled", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const packOpenOrder = new OpenOrderPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToOpenTab();
  await packOpenOrder.markReadyForPickup();
  await packOpenOrder.confirmReadyPickupAlert();
  await packOpenOrder.verifyorderPackedText();
});
