import { test, expect } from "../../fixtures";
import { LaunchpadPage } from "../pages/launchpad.page";
import { LoginPage } from "../pages/login.page";
import { OrderPage } from "../pages/orders/orders.page";
import { OpenOrderPage } from "../pages/orders/open-orders.page";
import { OpenDetailPage } from "../pages/order-detail/open-order-detail.page";
import { PackedOrderPage } from "../pages/orders/pack-orders.page";
import { PackedDetailPage } from "../pages/order-detail/pack-order-detail.page";
import { CompletedOrdersPage } from "../pages/orders/complete-orders.page";

/**
 * BOPIS End-to-End Lifecycle Test
 * 
 * This test demonstrates the best practices for Playwright automation:
 * 1. Environment-driven (uses .env via process.env)
 * 2. Page Object Model (POM) architecture
 * 3. Stable locators (getByTestId, getByRole)
 * 4. Comprehensive Open -> Packed -> Completed lifecycle verification
 */
test.describe("BOPIS Order Lifecycle", () => {
    // Increase timeout for the full lifecycle test
    test.setTimeout(90000);

    test("Complete full order lifecycle: Open -> Packed -> Completed", async ({ page }) => {
        console.log("Starting E2E Lifecycle Test...");
        const launchpad = new LaunchpadPage(page);
        const login = new LoginPage(page);
        const orderPage = new OrderPage(page);
        const openOrder = new OpenOrderPage(page);
        const openDetail = new OpenDetailPage(page);
        const packedOrder = new PackedOrderPage(page);
        const packedDetail = new PackedDetailPage(page);
        const completedOrders = new CompletedOrdersPage(page);

        // 1. Login via Launchpad
        await launchpad.goto();
        await launchpad.selectBopisApp();

        // Auth flow (handling OMS selection if necessary)
        await login.login(
            process.env.OMS_NAME,
            process.env.BOPIS_USERNAME,
            process.env.BOPIS_PASSWORD
        );
        await login.verifyLoginSuccess();

        // 2. Orders Page - Open Tab
        // Navigation is handled inside the POM methods
        console.log("Navigating to Open Orders tab...");
        await orderPage.goToOpenTab();

        // Lifecycle part A: Open -> Packed
        // We'll capture the order name to search for it in later tabs
        const orderName = await orderPage.getOrderName();
        console.log(`Processing Order: ${orderName}`);

        // Option 1: Pack from list (if buttons are visible) or via Detail
        // We'll go to detail for full validation
        console.log("Opening order detail...");
        await orderPage.clickFirstOrderCard();
        await openDetail.verifyDetailPage();
        console.log("Order detail page visible.");


        // Mark for pickup and handle picker modal (dynamic case)
        await openDetail.markReadyForPickup();

        // Handle Picker Modal if it appears
        if (await openDetail.assignPickerModal.isVisible()) {
            console.log("Assign Picker modal appeared, selecting first picker...");
            await openDetail.assignPickerAndSave(0);
        }

        // Handle Confirmation Alert if it appears
        if (await openDetail.readyForPickupAlertBox.isVisible()) {
            console.log("Confirmation alert appeared, clicking 'ready for pickup'...");
            await openDetail.confirmReadyPickupAlert();
        }

        // Wait for the success message (handling timeout/visibility gracefully)
        console.log("Waiting for order packed confirmation...");
        try {
            await openDetail.orderPackedText.waitFor({ state: "visible", timeout: 10000 });
            console.log("✓ Order packed confirmation visible.");
        } catch (e) {
            console.log("Success toast not detected (it might have disappeared), proceeding with verification.");
        }


        // 3. Navigation to Packed Tab
        // Return to list first, then switch tabs
        await openDetail.goBack();
        await orderPage.goToPackedTab();



        // Verify our order moved to Packed tab
        // Note: In parallel runs, we might search for the specific orderName
        const packedResult = await orderPage.searchByOrderName(orderName);
        await expect(packedResult).toBeVisible();

        // Lifecycle part B: Packed -> Completed (Handover)
        await packedResult.click();
        await packedDetail.verifyDetailPageVisible();

        // Handing over order (includes modal/alert handling)
        await packedDetail.handoverOrder();

        // 4. Verification in Completed Tab
        // Return to list first, then switch tabs
        await packedDetail.goBack();
        await orderPage.goToCompletedTab();




        // Final verification that order is now in Completed status
        const completedResult = await orderPage.searchByOrderName(orderName);
        await expect(completedResult).toBeVisible();

        console.log(`Successfully completed lifecycle for Order: ${orderName}`);
    });

    /**
     * Handling Empty States 
     * This demonstrates how to handle dynamic UI cases where no data exists
     */
    test("Verify graceful handling of empty order tabs", async ({ page }) => {
        const launchpad = new LaunchpadPage(page);
        const login = new LoginPage(page);
        const orderPage = new OrderPage(page);

        await launchpad.goto();
        await launchpad.selectBopisApp();
        await login.login(
            process.env.OMS_NAME,
            process.env.BOPIS_USERNAME,
            process.env.BOPIS_PASSWORD
        );


        // Check tabs - if orderCard is not found, we verify empty state text/locators
        await orderPage.goToOpenTab();
        const orderCount = await orderPage.orderCards.count();

        if (orderCount === 0) {
            console.log("No open orders found. Verifying empty state.");
            await expect(page.getByText(/no orders/i)).toBeVisible();
        } else {
            console.log(`${orderCount} open orders found.`);
        }
    });

});
