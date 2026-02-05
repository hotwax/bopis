import { test } from "../../fixtures";
import { PackedOrderPage } from "../pages/orders/pack-orders.page";
import { OrderDetailPage } from "../pages/order-detail/order-detail.page";
import { CompletedOrdersPage } from "../pages/orders/complete-orders.page";
import { OrderPage } from "../pages/orders/orders.page";

// Gift Card Activation Packed List page
test("Pack Orders Page: Gift Card Activation", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const packedOrders = new PackedOrderPage(page);
  const orderList = new OrderPage(page);
  await packedOrders.goToPackedTab();
  await orderList.openFirstGiftCardModalFromList();
  await orderList.activateGiftCard("mygiftcard123");
});

// Gift Card Activation Packed Detail page
test("Pack Details Page: Gift Card Activation", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const packedOrders = new PackedOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await packedOrders.goToPackedTab();
  await packedOrders.openFirstGiftCardOrder();
  // Gift card flow on detail page
  await detailPage.verifyDetailPage();
  await detailPage.openGiftCardModal();
  await detailPage.activateGiftCard("mygiftcard123");
});

// Gift Card Activation Completed Detail page
test("Completed Details Page: Gift Card Activation", async ({ page }) => {
  const completedOrders = new CompletedOrdersPage(page);
  const orderDetail = new OrderDetailPage(page);

  await page.goto(process.env.CURRENT_APP_URL);
  await completedOrders.goToCompletedTab();
  await completedOrders.openFirstGiftCardOrder();
  // Gift card flow on detail page
  await orderDetail.verifyDetailPage();
  await orderDetail.openGiftCardModal();
  await orderDetail.activateGiftCard("mygiftcard123");
});

// Gift Card Activation Completed List page
test("Completed Orders Page: Gift Card Activation", async ({ page }) => {
  const completedOrders = new CompletedOrdersPage(page);
  const orderDetail = new OrderDetailPage(page);
  const orderList = new OrderPage(page);

  await page.goto(process.env.CURRENT_APP_URL);
  await completedOrders.goToCompletedTab();
  // Directly open gift card modal from list card
  await orderList.openFirstGiftCardModalFromList();
  // Gift card activation
  await orderList.activateGiftCard("mygiftcard123");
});
