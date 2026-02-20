import { test, expect } from "../../fixtures";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";

async function openCompletedGiftCardOrderDetail(completedOrders, retries = 4) {
  for (let i = 0; i < retries; i++) {
    await completedOrders.goToCompletedTab();
    const giftCardOrders = completedOrders.orderCards.filter({
      has: completedOrders.giftCardActivationButton,
    });
    const count = await giftCardOrders.count();
    if (count > 0) {
      await giftCardOrders.first().click({ force: true });
      return true;
    }
    await completedOrders.page.waitForTimeout(2000);
  }
  return false;
}

test.describe("Gift card activation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.CURRENT_APP_URL);
  });
  
  // Gift Card Activation Packed List page
  test("Pack Orders Page", async ({ page }) => {
    // Scenario: activate gift card directly from packed list card.
    const packedOrders = new PackedOrderPage(page);
    const orderList = new OrderPage(page);
    await packedOrders.goToPackedTab();
    const giftCardListCount = await orderList.orderCards
      .filter({ has: orderList.giftCardActivationButton })
      .count();
    if (giftCardListCount === 0) {
      test.skip(true, "No gift card orders found in Packed list");
      return;
    }
    await orderList.openFirstGiftCardModalFromList();
    await orderList.activateGiftCard("mygiftcardtesting123");
  });

  // Gift Card Activation Packed Detail page
  test("Pack Details Page", async ({ page }) => {
    // Scenario: open packed order detail and activate gift card from item action.
    const packedOrders = new PackedOrderPage(page);
    const detailPage = new OrderDetailPage(page);

    const packedGiftCount = await packedOrders.orderCards
      .filter({ has: packedOrders.giftCardActivationButton })
      .count();
    if (packedGiftCount === 0) {
      test.skip(true, "No gift card orders found in Packed tab");
      return;
    }
    await packedOrders.openFirstGiftCardOrder();
    // Gift card flow on detail page
    await detailPage.verifyDetailPage();
    await detailPage.openGiftCardModal();
    await detailPage.activateGiftCard("mygiftcardtesting123");
  });

  // Gift Card Activation Completed Detail page
  test("Completed Details Page", async ({ page }) => {
    // Scenario: activate gift card from completed-order detail page.
    const completedOrders = new CompletedOrdersPage(page);
    const orderDetail = new OrderDetailPage(page);
    const orderListPage = new OrderPage(page);
    const opened = await openCompletedGiftCardOrderDetail(orderListPage, 5);
    if (!opened) {
      test.skip(true, "No gift card orders found in Completed tab");
      return;
    }
    // Gift card flow on detail page
    await orderDetail.verifyDetailPage();
    await orderDetail.openGiftCardModal();
    await orderDetail.activateGiftCard("mygiftcardtesting123");
  });

  // Gift Card Activation Completed List page
  test("Completed Orders Page", async ({ page }) => {
    // Scenario: activate gift card directly from completed list card.
    const completedOrders = new CompletedOrdersPage(page);
    const orderList = new OrderPage(page);
    const completedListGiftCount = await completedOrders.orderCards
      .filter({ has: completedOrders.giftCardActivationButton })
      .count();
    if (completedListGiftCount === 0) {
      test.skip(true, "No gift card orders found in Completed list");
      return;
    }
    // Directly open gift card modal from list card
    const firstGiftCard = completedOrders.orderCards
      .filter({ has: completedOrders.giftCardActivationButton })
      .first();
    await firstGiftCard.waitFor({ state: "visible", timeout: 10000 });
    const giftIcon = firstGiftCard.getByTestId("gift-card-activation-button").first();
    await giftIcon.click({ force: true });
    await expect(orderList.giftCardModal).toBeVisible();
    // Gift card activation
    await orderList.activateGiftCard("mygiftcardtesting123");
  });
})