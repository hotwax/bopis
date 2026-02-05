import { test } from "../../fixtures";
import { OpenDetailPage } from "../pages/order-detail/open-order-detail.page";
import { OrderPage } from "../pages/orders/orders.page";
import { OrderDetailPage } from "../pages/order-detail/order-detail.page";

// Print picklist from Detail page (Case 1: Picker Not Assigned)
test("Open Details Page: Print Picklist When Picker Not Assigned", async ({
  page,
}) => {
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const orderDetail = new OrderDetailPage(page);

  console.log('CURRENT_APP_URL:', process.env.CURRENT_APP_URL);
  await page.goto(process.env.CURRENT_APP_URL);
  await orderPage.goToOpenTab();
  await orderPage.clickFirstOrderCard();

  await openDetail.verifyDetailPage();
  await openDetail.printPicklist();
  await openDetail.verifyAssignPickerModal();
  await openDetail.assignPickerAndSave(0);
  await orderDetail.handlePopupAndVerify();
});

// Print picklist from Detail page (Case 2: Picker Already Assigned)
test("Open Details Page: Print Picklist When Picker Is Assigned", async ({
  page,
}) => {
  await page.goto(process.env.CURRENT_APP_URL);
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const orderDetail = new OrderDetailPage(page);

  await orderPage.goToOpenTab();
  await orderPage.clickFirstOrderCard();
  await openDetail.verifyDetailPage();
  await openDetail.printPicklist();
  await orderDetail.handlePopupAndVerify();
});
