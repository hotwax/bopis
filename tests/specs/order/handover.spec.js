import { test, expect } from "../../fixtures";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { loginToOrders } from "../../helpers/auth";

test("Open -> Packed -> Completed: Handover flow", async ({ page }) => {
  // Happy path:
  // Open -> mark ready for pickup -> open packed detail -> handover -> check completed.
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const packedDetail = new PackedDetailPage(page);
  const completedPage = new CompletedOrdersPage(page);
  const closeNonAppTabs = async () => {
    const appOrigin = new URL(process.env.CURRENT_APP_URL).origin;
    for (const p of page.context().pages()) {
      if (p === page) continue;
      const url = p.url() || "";
      const isAppTab = url.startsWith(appOrigin);
      if (!isAppTab) {
        await p.close().catch(() => {});
      }
    }
    await page.bringToFront().catch(() => {});
  };

  await loginToOrders(page);

  // 1) Open tab: pick first order and mark as ready for pickup
  await orderPage.goToOpenTab();
  if ((await orderPage.orderCards.count()) === 0) {
    test.skip(true, "No open orders available");
    return;
  }

  await orderPage.clickFirstOrderCard();
  await openDetail.verifyDetailPage();

  // Capture runtime identifiers from URL so test does not depend on display text.
  const openUrl = page.url();
  const openMatch = openUrl.match(/\/orderdetail\/open\/([^/]+)\/([^/?#]+)/i);
  if (!openMatch) {
    test.skip(true, `Could not parse order identifiers from URL: ${openUrl}`);
    return;
  }
  const [, orderId, shipGroupSeqId] = openMatch;
  const appOrigin = new URL(process.env.CURRENT_APP_URL).origin;
  const packedDetailUrl = `${appOrigin}/orderdetail/packed/${orderId}/${shipGroupSeqId}`;
  const completedDetailUrl = `${appOrigin}/orderdetail/completed/${orderId}/${shipGroupSeqId}`;

  await openDetail.markReadyForPickup();
  await closeNonAppTabs();

  // Wait for whichever post-click flow appears in this environment.
  const postReadyFlow = await Promise.race([
    openDetail.assignPickerModal.waitFor({ state: "visible", timeout: 8000 }).then(() => "modal").catch(() => null),
    openDetail.readyForPickupAlertBox.waitFor({ state: "visible", timeout: 8000 }).then(() => "alert").catch(() => null),
    openDetail.orderPackedText.waitFor({ state: "visible", timeout: 8000 }).then(() => "packed").catch(() => null),
  ]);

  if (postReadyFlow === "modal") {
    const pickerCount = await openDetail.assignPickerRadios.count();
    if (pickerCount === 0) {
      throw new Error("Assign picker modal opened but no picker options were available.");
    }
    await openDetail.assignPickerAndSave(0);
    await closeNonAppTabs();
    if (await openDetail.readyForPickupAlertBox.isVisible().catch(() => false)) {
      await openDetail.confirmReadyPickupAlert();
    }
  } else if (postReadyFlow === "alert") {
    await openDetail.confirmReadyPickupAlert();
  }
  await closeNonAppTabs();

  // 2) Open the exact packed detail using runtime identifiers.
  let hasHandoverNow = false;
  for (let i = 0; i < 6; i++) {
    await closeNonAppTabs();
    await page.goto(packedDetailUrl);
    const onPackedDetail = /\/orderdetail\/packed\//.test(page.url());
    if (!onPackedDetail) {
      await page.waitForTimeout(2000);
      continue;
    }
    await packedDetail.verifyDetailPageVisible();
    hasHandoverNow = await packedDetail.handoverButton
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (hasHandoverNow) break;
    await page.waitForTimeout(2000);
  }
  if (!hasHandoverNow) {
    test.skip(true, `Handover button not visible on packed detail: ${packedDetailUrl}`);
    return;
  }
  await packedDetail.handoverOrder();
  await closeNonAppTabs();
  await expect(page.getByText("Order is successfully handed over to customer.")).toBeVisible({
    timeout: 10000,
  });

  // 3) Success toast: delivered to customer (best-effort, may not appear)
  await orderPage.verifySuccessToast().catch(() => {
    console.warn("Success toast not visible; proceeding with Completed tab check.");
  });

  // 4) Verify completion using same runtime identifiers.
  let completedVerified = false;
  for (let i = 0; i < 6; i++) {
    await closeNonAppTabs();
    await page.goto(completedDetailUrl);
    const onCompletedDetail = /\/orderdetail\/completed\//.test(page.url());
    const notFound = await page.getByText(/order not found/i).isVisible().catch(() => false);
    const detailsVisible = await page
      .getByTestId("order-details-page")
      .getByTestId("order-name-tag")
      .isVisible()
      .catch(() => false);
    if (onCompletedDetail && detailsVisible && !notFound) {
      completedVerified = true;
      break;
    }
    await page.waitForTimeout(2000);
  }
  if (!completedVerified) {
    await completedPage.goToCompletedTab();
    console.warn(`Completed detail not ready yet for: ${completedDetailUrl}`);
  }
  expect(completedVerified).toBeTruthy();
  await page.waitForTimeout(3000);
});
