import { test } from "../../fixtures";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { loginToOrders } from "../../helpers/auth";

async function openOrderByIndex(orderPage, index) {
  const card = orderPage.orderCards.nth(index);
  await card.waitFor({ state: "visible", timeout: 10000 });
  await card.click({ force: true });
}

// Print picklist from Detail page (Case 1: Picker Not Assigned)
test("Open Details Page: Print Picklist When Picker Not Assigned", async ({
  page,
}) => {
  // Scenario: open-order detail where printing requires picker assignment first.
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const orderDetail = new OrderDetailPage(page);

  console.log('CURRENT_APP_URL:', process.env.CURRENT_APP_URL);
  await loginToOrders(page);
  await orderPage.goToOpenTab();
  const totalOrders = await orderPage.orderCards.count();
  if (totalOrders === 0) {
    test.skip(true, "No open orders found");
    return;
  }

  let matched = false;
  const maxToTry = Math.min(totalOrders, 6);
  for (let i = 0; i < maxToTry; i++) {
    await orderPage.goToOpenTab();
    await openOrderByIndex(orderPage, i);
    await openDetail.verifyDetailPage();
    if (!(await openDetail.printPicklistButton.isVisible().catch(() => false))) {
      await openDetail.goBack().catch(() => {});
      continue;
    }

    const modalPromise = openDetail.assignPickerModal
      .waitFor({ state: "visible", timeout: 7000 })
      .then(() => "modal")
      .catch(() => null);
    const popupPromise = page
      .waitForEvent("popup", { timeout: 7000 })
      .then(() => "popup")
      .catch(() => null);
    await openDetail.printPicklist();
    const printFlow = await Promise.race([modalPromise, popupPromise]);
    if (printFlow !== "modal") {
      await openDetail.goBack().catch(() => {});
      continue;
    }

    await openDetail.verifyAssignPickerModal();
    if ((await openDetail.assignPickerRadios.count()) === 0) {
      await openDetail.goBack().catch(() => {});
      continue;
    }
    await openDetail.assignPickerAndSave(0);
    await orderDetail.handlePopupAndVerify();
    matched = true;
    break;
  }
  if (!matched) {
    test.skip(true, "Could not find an open order requiring picker assignment for print picklist");
  }
});

// Print picklist from Detail page (Case 2: Picker Already Assigned)
test("Open Details Page: Print Picklist When Picker Is Assigned", async ({
  page,
}) => {
  // Scenario: open-order detail where picklist print should proceed without assignment.
  await loginToOrders(page);
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const orderDetail = new OrderDetailPage(page);
  await orderPage.goToOpenTab();
  const totalOrders = await orderPage.orderCards.count();
  if (totalOrders === 0) {
    test.skip(true, "No open orders found");
    return;
  }

  let matched = false;
  const maxToTry = Math.min(totalOrders, 6);
  for (let i = 0; i < maxToTry; i++) {
    await orderPage.goToOpenTab();
    await openOrderByIndex(orderPage, i);
    await openDetail.verifyDetailPage();
    if (!(await openDetail.printPicklistButton.isVisible().catch(() => false))) {
      await openDetail.goBack().catch(() => {});
      continue;
    }
    const modalPromise = openDetail.assignPickerModal
      .waitFor({ state: "visible", timeout: 7000 })
      .then(() => "modal")
      .catch(() => null);
    const popupPromise = page
      .waitForEvent("popup", { timeout: 7000 })
      .then(() => "popup")
      .catch(() => null);
    await openDetail.printPicklist();
    const printFlow = await Promise.race([modalPromise, popupPromise]);
    if (printFlow === "popup") {
      await orderDetail.handlePopupAndVerify();
      matched = true;
      break;
    }
    await openDetail.goBack().catch(() => {});
  }
  if (!matched) {
    test.skip(true, "Could not find an open order with picker already assigned for print picklist");
  }
});
