import { expect, test } from "../../fixtures";
import { OpenOrderPage } from "../pages/orders/open-orders.page";
import { OrderDetailPage } from "../pages/order-detail/order-detail.page";
import { PackedOrderPage } from "../pages/orders/pack-orders.page";

test("Open Details Page: Edit Picker", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);
  const openOrders = new OpenOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await openOrders.goToOpenTab();
  await openOrders.firstCard.click();

  await detailPage.verifyDetailPage();
  await detailPage.openEditPickerModal();
  await detailPage.selectDifferentPicker();
  await detailPage.saveEditPicker();
  await detailPage.verifyPickerReplacedToast();
});

test("Pack Details Page: Edit Picker", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);
  const packedOrders = new PackedOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await packedOrders.goToPackedTab();
  await packedOrders.firstCard.click();

  await detailPage.verifyDetailPage();
  await detailPage.openEditPickerModal();
  await detailPage.selectDifferentPicker();
  await detailPage.saveEditPicker();
  await detailPage.verifyPickerReplacedToast();
});
