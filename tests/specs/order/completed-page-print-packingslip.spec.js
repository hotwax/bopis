import { test } from "../../fixtures";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";

// Case 1: Generate Packing Slip from List Page
test("Pack Orders Page: Generate Packing Slip", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const completedOrders = new CompletedOrdersPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToCompletedTab();

  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No completed orders found");
    return;
  }

  await completedOrders.printCustomerLetter();
  await orderPage.handlePopupAndVerify();
});
