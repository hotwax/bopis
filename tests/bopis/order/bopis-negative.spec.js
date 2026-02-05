import { test, expect } from "../../fixtures";
import { LaunchpadPage } from "../pages/launchpad.page";
import { LoginPage } from "../pages/login.page";
import { OrderPage } from "../pages/orders/orders.page";
import { OpenDetailPage } from "../pages/order-detail/open-order-detail.page";

/**
 * BOPIS Negative Test Scenarios
 * 
 * This suite covers error handling, empty states, and invalid transitions
 * to ensure the app handles edge cases gracefully.
 */
test.describe("BOPIS Negative Scenarios", () => {
    // Shared setup for negative tests
    test.beforeEach(async ({ page }) => {
        const launchpad = new LaunchpadPage(page);
        const login = new LoginPage(page);

        await launchpad.goto();
        await launchpad.selectBopisApp();
        await login.login(
            process.env.OMS_NAME,
            process.env.BOPIS_USERNAME,
            process.env.BOPIS_PASSWORD
        );
        await login.verifyLoginSuccess();
    });

    test("Scenario 1: Verify 'No orders found' empty state", async ({ page }) => {
        const orderPage = new OrderPage(page);

        console.log("Checking for empty state on a potentially empty tab...");
        // We can't guarantee a tab is empty, so we'll check if orders exist first
        await orderPage.goToOpenTab();
        const count = await orderPage.orderCards.count();

        if (count === 0) {
            console.log("Tab is empty, verifying message...");
            await expect(orderPage.noOrdersMessage).toBeVisible();
        } else {
            console.log(`Tab has ${count} orders. To force this, search for a non-existent order.`);
            await orderPage.searchBar.fill("NON_EXISTENT_ORDER_12345");
            await page.keyboard.press("Enter");
            await orderPage.waitForOverlays();
            await expect(orderPage.noOrdersMessage).toBeVisible();
        }
    });

    test("Scenario 2: Handle missing 'Ready for Pickup' or modal failure", async ({ page }) => {
        const orderPage = new OrderPage(page);
        const openDetail = new OpenDetailPage(page);

        await orderPage.goToOpenTab();
        if (await orderPage.orderCards.count() === 0) {
            test.skip("No orders available to test detail page.");
        }

        await orderPage.clickFirstOrderCard();
        await openDetail.verifyDetailPage();

        // Negative Check: Verify button exists. If not, we log and fail gracefully
        const isReadyButtonVisible = await openDetail.readyForPickupButton.isVisible();
        if (!isReadyButtonVisible) {
            console.warn("Ready for Pickup button is not visible. Checking if order is already packed.");
            // This might happen if the order is already in a state where it shouldn't be packed
            await expect(openDetail.readyForPickupButton, "Ready for Pickup button should be visible for open orders").toBeVisible();
        }

        // Negative Check: Attempt to trigger picker modal
        await openDetail.readyForPickupButton.click({ force: true });

        // Assert modal opens within timeout
        try {
            await openDetail.assignPickerModal.waitFor({ state: "visible", timeout: 5000 });
        } catch (e) {
            throw new Error("FAIL: Picker assignment modal did not open after clicking Ready for Pickup.");
        }
    });

    test("Scenario 3: Validate Picker Assignment empty state and block save", async ({ page }) => {
        const orderPage = new OrderPage(page);
        const openDetail = new OpenDetailPage(page);

        await orderPage.goToOpenTab();
        if (await orderPage.orderCards.count() === 0) test.skip();

        await orderPage.clickFirstOrderCard();
        await openDetail.markReadyForPickup();
        await openDetail.verifyAssignPickerModal();

        const pickerCount = await openDetail.assignPickerRadios.count();
        if (pickerCount === 0) {
            console.log("No pickers available. Verifying if empty state message or just no list is handled.");
            // If the app doesn't show a specific text, we at least expect the Save button to be disabled
            await expect(openDetail.assignPickerSaveButton).toBeDisabled();
        }

        // Negative Check: Save button should be disabled (or at least no action taken) if no picker selected
        if (pickerCount > 0) {
            console.log("Pickers exist. Verifying that Save is blocked without selection.");
            // We assume initially nothing is selected
            await expect(openDetail.assignPickerSaveButton).toBeDisabled();
        }
    });


    test("Scenario 4: Verify failure when new tab (Invoice/PDF) doesn't open", async ({ page }) => {
        const orderPage = new OrderPage(page);
        const openDetail = new OpenDetailPage(page);

        await orderPage.goToOpenTab();
        if (await orderPage.orderCards.count() === 0) test.skip();

        await orderPage.clickFirstOrderCard();

        // Negative Check: Ensure tab opens
        console.log("Checking for Print Picklist tab opening...");
        const popupPromise = page.waitForEvent("popup", { timeout: 10000 });
        await openDetail.printPicklistButton.click({ force: true });
        const popup = await popupPromise;

        await expect(popup, "Invoice/Picklist tab should open").toBeTruthy();
        console.log(`✓ Tab opened: ${popup.url()}`);

        // Negative Check: Page fails to load (check for error or specific content)
        await popup.waitForLoadState("domcontentloaded");
        await expect(popup, "Invoice/Picklist page should not be error").not.toHaveTitle(/error/i);
    });


    test("Scenario 5: Validate Order State Persistence (MISMATCH CASE)", async ({ page }) => {
        const orderPage = new OrderPage(page);

        await orderPage.goToOpenTab();
        if (await orderPage.orderCards.count() === 0) test.skip();

        const orderName = await orderPage.getOrderName();

        // Negative Case: Check order does NOT exist in Completed tab yet
        console.log(`Verification: ${orderName} should NOT be in Completed tab yet.`);
        await orderPage.goToCompletedTab();

        // Use a filter to see if IT EXISTS (we expect it NOT TO)
        const mismatchCard = orderPage.orderCards.filter({ hasText: orderName });
        const exists = await mismatchCard.isVisible().catch(() => false);

        if (exists) {
            throw new Error(`FAIL: Order ${orderName} already found in Completed tab before handover!`);
        }
        console.log("✓ Success: Order state persistence confirmed (not found in Completed tab).");
    });
});
