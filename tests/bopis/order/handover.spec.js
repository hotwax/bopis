import { test, expect } from "../../fixtures";
import { PackedOrderPage } from "../pages/orders/pack-orders.page";
import { PackedDetailPage } from "../pages/order-detail/pack-order-detail.page";
import { CompletedOrdersPage } from "../pages/orders/complete-orders.page";
import { OrderPage } from "../pages/orders/orders.page";

test("Pack Orders Page: Handover", async ({ page }) => {
  const packedPage = new PackedOrderPage(page);
  const completedPage = new CompletedOrdersPage(page);
  const orderPage = new OrderPage(page);

  await page.goto(process.env.CURRENT_APP_URL);
  await packedPage.goToPackedTab();
  const orderName = await orderPage.getOrderName();
  await packedPage.clickHandover();
  await orderPage.verifySuccessToast();
  await completedPage.goToCompletedTab();
  // Assert order exists in completed tab
  const orderInCompleted = await orderPage.searchByOrderName(orderName);
  await expect(orderInCompleted).toHaveCount(1);
});

test(" Packed Details Page: Handover", async ({ page }) => {
  const packedPage = new PackedOrderPage(page);
  const packedDetailPage = new PackedDetailPage(page);
  const completedPage = new CompletedOrdersPage(page);
  const orderPage = new OrderPage(page);

  await page.goto(process.env.CURRENT_APP_URL);
  await packedPage.goToPackedTab();
  const orderName = await orderPage.getOrderName();
  await packedPage.openFirstOrderDetail();
  await packedDetailPage.verifyDetailPageVisible();
  await packedDetailPage.handoverOrder();
  await page.goBack();
  await completedPage.goToCompletedTab();
  // Assert order exists in completed tab
  const orderInCompleted = await orderPage.searchByOrderName(orderName);
  await expect(orderInCompleted).toHaveCount(1);
});
