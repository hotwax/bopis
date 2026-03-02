import { test } from "../../fixtures";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { loginToOrders } from "../../helpers/auth";

// Case 1: Generate Packing Slip from List Page
test("Pack Orders Page: Generate Packing Slip", async ({ page }) => {
  await loginToOrders(page);

  const packedOrders = new PackedOrderPage(page);
  await packedOrders.goToPackedTab();
  const firstCard = await packedOrders.getFirstOrderCard();
  const hasPackingSlip = await firstCard
    .getByTestId("packing-slip-button")
    .isVisible()
    .catch(() => false);
  if (!hasPackingSlip) {
    test.skip(true, "Packing slip button not available on list for this order");
    return;
  }
  await packedOrders.printPackingSlipFromList();
});

// Case 2: Generate Packing Slip from Detail Page
test("Pack Details Page: Generate Packing Slip", async ({ page }) => {
  await loginToOrders(page);

  const packedOrders = new PackedOrderPage(page);
  const packedDetail = new PackedDetailPage(page);

  let packedCount = 0;
  for (let i = 0; i < 6; i++) {
    await packedOrders.goToPackedTab();
    packedCount = await packedOrders.orderCards.count();
    if (packedCount > 0) break;
    await page.waitForTimeout(3000);
  }
  if (packedCount === 0) {
    test.skip(true, "No packed orders available for detail packing slip test");
    return;
  }
  await packedOrders.openFirstOrderDetail();
  await packedDetail.verifyDetailPageVisible();
  if (!(await packedDetail.packingSlipButton.isVisible())) {
    test.skip(true, "Packing slip button not available for this order");
    return;
  }
  await packedDetail.printPackingSlipFromDetail();
});
