import { expect, test } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";
import { loginToOrders } from "../../helpers/auth";

test("Open Details Page: Edit Picker", async ({ page }) => {
  await loginToOrders(page);

  const openOrders = new OpenOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await openOrders.goToOpenTab();

  if (await openOrders.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }

  await openOrders.firstCard.click();

  await detailPage.verifyDetailPage();
  if (!(await detailPage.editPickerChip.isVisible())) {
    test.skip(true, "Edit Picker not available for this packed order");
    return;
  }
  await detailPage.openEditPickerModal();
  await detailPage.selectDifferentPicker();
  await detailPage.saveEditPicker();
  await detailPage.verifyPickerReplacedToast();
});

test("Pack Details Page: Edit Picker", async ({ page }) => {
  await loginToOrders(page);

  const packedOrders = new PackedOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await packedOrders.goToPackedTab();

  if (await packedOrders.orderCards.count() === 0) {
    test.skip(true, "No packed orders found");
    return;
  }

  await packedOrders.firstCard.click();

  await detailPage.verifyDetailPage();
  if (!(await detailPage.editPickerChip.isVisible())) {
    test.skip(true, "Edit Picker not available for this packed order");
    return;
  }
  await detailPage.openEditPickerModal();
  await detailPage.selectDifferentPicker();
  await detailPage.saveEditPicker();
  await detailPage.verifyPickerReplacedToast();
});
