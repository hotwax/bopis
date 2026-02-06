import { test } from "../../fixtures";
import { PackedOrderPage } from "../pages/orders/pack-orders.page";
import { PackedDetailPage } from "../pages/order-detail/pack-order-detail.page";

// Case 1: Generate Packing Slip from List Page
test("Pack Orders Page: Generate Packing Slip", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const packedOrders = new PackedOrderPage(page);
  await packedOrders.goToPackedTab();
  await packedOrders.printPackingSlipFromList();
});

// Case 2: Generate Packing Slip from Detail Page
test("Pack Details Page: Generate Packing Slip", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const packedOrders = new PackedOrderPage(page);
  const packedDetail = new PackedDetailPage(page);

  await packedOrders.goToPackedTab();
  await packedOrders.openFirstOrderDetail();
  await packedDetail.verifyDetailPageVisible();
  await packedDetail.printPackingSlipFromDetail();
});
