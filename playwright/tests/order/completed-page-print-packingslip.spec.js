import { test } from "../../fixtures";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { loginToOrders } from "../../helpers/auth";

// Case 1: Generate Packing Slip from List Page
test("Pack Orders Page: Generate Packing Slip", async ({ page }) => {
  await loginToOrders(page);

  const completedOrders = new CompletedOrdersPage(page);
  const orderPage = new OrderPage(page);
  await completedOrders.goToCompletedTab();
  await completedOrders.printCustomerLetter();
  await orderPage.handlePopupAndVerify();
});
