import { test } from "../../fixtures";
import { OpenOrderPage } from "../pages/orders/open-orders.page";
import { OrderDetailPage } from "../pages/order-detail/order-detail.page";
import { PackedDetailPage } from "../pages/order-detail/pack-order-detail.page";
import { OrderPage } from "../pages/orders/orders.page";
import { OpenDetailPage } from "../pages/order-detail/open-order-detail.page";

// ---------------- SINGLE ITEM ORDER REJECTION ----------------
test("Open Details Page: Single Item Order Rejection", async ({ page }) => {
  const openOrders = new OpenOrderPage(page);
  const orderDetail = new OrderDetailPage(page);
  const openOrderDetail = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);

  await page.goto(process.env.CURRENT_APP_URL);
  await openOrders.goToOpenTab();
  await orderPage.clickFirstOrderCard();
  await orderDetail.verifyDetailPage();
  // Reject a single item
  await openOrderDetail.rejectSingleItem();
});

// ---------------- MULTIPLE ITEM ORDER REJECTION ----------------
test("Open Details Page: Multiple Item Order Rejection", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const openOrders = new OpenOrderPage(page);
  const orderDetail = new OrderDetailPage(page);
  const openOrderDetail = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);

  await openOrders.goToOpenTab();
  await orderPage.clickFirstOrderCard();
  await orderDetail.verifyDetailPage();
  // Reject one item from multiple
  await openOrderDetail.rejectOneItemFromMultiple();
});

// ---------------- SINGLE ITEM ORDER CANCELLATION ----------------
test("Packed Details Page: Single Item Order Cancellation", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const openOrders = new OpenOrderPage(page);
  const packedDetail = new PackedDetailPage(page);
  const orderPage = new OrderPage(page);

  await orderPage.goToPackedTab();
  await orderPage.clickFirstOrderCard();
  await packedDetail.verifyDetailPageVisible();
  // Cancel single item
  await packedDetail.cancelSingleItem();
});

// ---------------- MULTIPLE ITEM ORDER CANCELLATION ----------------
test("Packed Details Page: Multiple Item Order Cancellation", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);
  const packedDetail = new PackedDetailPage(page);
  const orderPage = new OrderPage(page);
  await orderPage.goToPackedTab();
  await orderPage.clickFirstOrderCard();
  await packedDetail.verifyDetailPageVisible();
  // Cancel one item from multiple
  await packedDetail.cancelOneItemFromMultiple();
});
