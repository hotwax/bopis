import { test } from "../../fixtures";
import { CompletedOrdersPage } from "../pages/orders/complete-orders.page";
import { OrderPage } from "../pages/orders/orders.page";

// Case 1: Generate Packing Slip from List Page
test("Pack Orders Page: Generate Packing Slip", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const completedOrders = new CompletedOrdersPage(page);
  const orderPage = new OrderPage(page);
  await completedOrders.goToCompletedTab();
  await completedOrders.printCustomerLetter();
  await orderPage.handlePopupAndVerify();
});
