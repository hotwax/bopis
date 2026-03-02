import { test } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { loginToOrders } from "../../helpers/auth";

async function openOpenOrderByItemCount({
  page,
  openOrders,
  orderPage,
  orderDetail,
  openOrderDetail,
  predicate,
  maxCardsToTry = 8,
}) {
  let total = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    await openOrders.goToOpenTab();
    total = await orderPage.openOrdersContainer
      .getByTestId("order-card")
      .count()
      .catch(() => 0);
    if (total > 0) break;
    await page.waitForTimeout(2000);
  }
  if (total === 0) return false;
  const limit = Math.min(total, maxCardsToTry);

  for (let i = 0; i < limit; i++) {
    const card = orderPage.openOrdersContainer.getByTestId("order-card").nth(i);
    if (!(await card.isVisible().catch(() => false))) continue;
    await card.click({ force: true });
    await orderDetail.verifyDetailPage();
    const hasRejectAction = await openOrderDetail.rejectItemButton.first().isVisible().catch(() => false);
    if (!hasRejectAction) {
      await page.goBack().catch(() => {});
      await openOrders.goToOpenTab();
      continue;
    }
    const itemCount = await openOrderDetail.detailPageIonItems.count();
    if (predicate(itemCount)) return true;
    await page.goBack().catch(() => {});
    await page.waitForURL(/tabs\/orders/, { timeout: 10000 }).catch(() => {});
    await orderPage.openOrdersContainer.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  }
  return false;
}

async function openPackedOrderByItemCount({
  orderPage,
  packedDetail,
  predicate,
  maxCardsToTry = 8,
}) {
  await orderPage.goToPackedTab();
  const cards = orderPage.packedOrdersContainer.getByTestId("order-card");
  const total = await cards.count();
  const limit = Math.min(total, maxCardsToTry);

  for (let i = 0; i < limit; i++) {
    const card = orderPage.packedOrdersContainer.getByTestId("order-card").nth(i);
    if (!(await card.isVisible().catch(() => false))) continue;
    await card.click({ force: true });
    await packedDetail.verifyDetailPageVisible();
    const itemCount = await packedDetail.detailPageIonItems.count();
    if (predicate(itemCount)) return true;
    await packedDetail.goBack().catch(() => {});
    await orderPage.packedOrdersContainer.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  }
  return false;
}

// ---------------- SINGLE ITEM ORDER REJECTION ----------------
test("Open Details Page: Single Item Order Rejection", async ({ page }) => {
  // Scenario: reject flow for orders that contain exactly one line item.
  const openOrders = new OpenOrderPage(page);
  const orderDetail = new OrderDetailPage(page);
  const openOrderDetail = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);

  await loginToOrders(page);
  const hasMatchingOrder = await openOpenOrderByItemCount({
    page,
    openOrders,
    orderPage,
    orderDetail,
    openOrderDetail,
    predicate: (count) => count >= 1,
  });
  if (!hasMatchingOrder) {
    test.skip(true, "No open orders found");
    return;
  }
  // Reject a single item
  await openOrderDetail.rejectSingleItem();
});

// ---------------- MULTIPLE ITEM ORDER REJECTION ----------------
test("Open Details Page: Multiple Item Order Rejection", async ({ page }) => {
  // Scenario: reject flow for orders with multiple line items.
  const openOrders = new OpenOrderPage(page);
  const orderDetail = new OrderDetailPage(page);
  const openOrderDetail = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);

  await loginToOrders(page);
  const hasMatchingOrder = await openOpenOrderByItemCount({
    page,
    openOrders,
    orderPage,
    orderDetail,
    openOrderDetail,
    predicate: (count) => count >= 2,
  });
  if (!hasMatchingOrder) {
    test.skip(true, "Order has a single item; skipping multiple-item rejection test");
    return;
  }
  // Reject one item from multiple
  await openOrderDetail.rejectOneItemFromMultiple();
});

// ---------------- SINGLE ITEM ORDER CANCELLATION ----------------
test("Packed Details Page: Single Item Order Cancellation", async ({
  page,
}) => {
  // Scenario: cancel flow for packed orders with one line item.
  const packedDetail = new PackedDetailPage(page);
  const orderPage = new OrderPage(page);

  await loginToOrders(page);
  const hasMatchingOrder = await openPackedOrderByItemCount({
    orderPage,
    packedDetail,
    predicate: (count) => count >= 1,
  });
  if (!hasMatchingOrder) {
    test.skip(true, "No packed orders found");
    return;
  }
  // Cancel single item
  await packedDetail.cancelSingleItem();
});

// ---------------- MULTIPLE ITEM ORDER CANCELLATION ----------------
test("Packed Details Page: Multiple Item Order Cancellation", async ({
  page,
}) => {
  // Scenario: cancel flow for packed orders with multiple line items.
  const packedDetail = new PackedDetailPage(page);
  const orderPage = new OrderPage(page);
  await loginToOrders(page);
  const hasMatchingOrder = await openPackedOrderByItemCount({
    orderPage,
    packedDetail,
    predicate: (count) => count >= 2,
  });
  if (!hasMatchingOrder) {
    test.skip(true, "No packed orders found");
    return;
  }
  // Cancel one item from multiple
  await packedDetail.cancelOneItemFromMultiple();
});
