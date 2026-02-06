import { test } from "../../fixtures";
import { OpenDetailPage } from "../pages/order-detail/open-order-detail.page";
import { OrderPage } from "../pages/orders/orders.page";

// Packed order from Open detail page by Assigning the Picker when the Enable Tracking is on
test("Open Details Page: Pack Order When Tracking Enabled", async ({
  page,
}) => {
  const packOpenOrder = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);
  await page.goto(process.env.CURRENT_APP_URL);
  await orderPage.goToOpenTab();
  await orderPage.clickFirstOrderCard();
  await packOpenOrder.verifyDetailPage();
  await packOpenOrder.markReadyForPickup();
  await packOpenOrder.assignPickerAndSave(1);
  // verify that success label are now visible
  await packOpenOrder.verifyOrderPackedMessage();
});

// Packed order from Open detail page when the Enable Tracking is off
test("Open Details Page: Pack Order When Tracking Disabled", async ({
  page,
}) => {
  const packOpenOrder = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);
  await page.goto(process.env.CURRENT_APP_URL);
  await orderPage.goToOpenTab();
  await orderPage.clickFirstOrderCard();
  await packOpenOrder.verifyDetailPage();
  await packOpenOrder.markReadyForPickup();
  await packOpenOrder.confirmReadyPickupAlert();
  // verify that success label are now visible
  await packOpenOrder.verifyOrderPackedMessage();
});
