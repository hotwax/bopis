if (process.platform === "darwin" && process.arch === "arm64") {
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE = "mac15-arm64";
}

const { test, expect } = require("../../fixtures");
const { OrderPage } = require("../../pages/orders/orders.page");
const { OrderDetailPage } = require("../../pages/order-detail/order-detail.page");
const { OpenDetailPage } = require("../../pages/order-detail/open-order-detail.page");
const { PackedDetailPage } = require("../../pages/order-detail/pack-order-detail.page");
const { loginToOrders } = require("../../helpers/auth");

test.describe("BOPIS Order Details", () => {
  test.beforeEach(async ({ page }) => {
    await loginToOrders(page);
  });

  test("Open order details show correct order name", async ({ page }) => {
    const orderPage = new OrderPage(page);
    const orderDetail = new OrderDetailPage(page);
    const openDetail = new OpenDetailPage(page);
    await orderPage.goToOpenTab();

    if (await orderPage.orderCards.count() === 0) {
      test.skip(true, "No open orders found");
      return;
    }

    const listOrderName = await orderPage.getOrderName();
    await orderPage.clickFirstOrderCard();

    await openDetail.verifyDetailPage();
    const detailOrderName = await orderDetail.getOrderName();

    expect(detailOrderName).toBe(listOrderName);

    await openDetail.goBack();
  });

  test("Packed order details show correct order name and handover action", async ({ page }) => {
    const orderPage = new OrderPage(page);
    const orderDetail = new OrderDetailPage(page);
    const packedDetail = new PackedDetailPage(page);
    await orderPage.goToPackedTab();

    if (await orderPage.orderCards.count() === 0) {
      test.skip(true, "No packed orders found");
      return;
    }

    const listOrderName = await orderPage.getOrderName();
    await orderPage.clickFirstOrderCard();

    await packedDetail.verifyDetailPageVisible();
    const detailOrderName = await orderDetail.getOrderName();

    expect(detailOrderName).toBe(listOrderName);
    await expect(packedDetail.handoverButton).toBeVisible();

    await packedDetail.goBack();
  });

  test("Completed order details show correct order name", async ({ page }) => {
    const orderPage = new OrderPage(page);
    const orderDetail = new OrderDetailPage(page);
    await orderPage.goToCompletedTab();

    if (await orderPage.orderCards.count() === 0) {
      test.skip(true, "No completed orders found");
      return;
    }

    const listOrderName = await orderPage.getOrderName();
    await orderPage.clickFirstOrderCard();

    await orderDetail.verifyDetailPage();
    const detailOrderName = await orderDetail.getOrderName();

    expect(detailOrderName).toBe(listOrderName);
  });
});
