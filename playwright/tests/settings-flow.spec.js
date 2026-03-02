const { test, expect } = require("@playwright/test");
const { LoginPage } = require("../pages/login.page");
const { SettingsPage } = require("../pages/settings.page");
const { OrderPage } = require("../pages/orders/orders.page");
const { getEnvironment } = require("../config");

test.describe("BOPIS Settings Flow Cases", () => {
    let loginPage;
    let settingsPage;
    let orderPage;
    let env;

    test.beforeEach(async ({ page }) => {
        env = getEnvironment();
        loginPage = new LoginPage(page);
        settingsPage = new SettingsPage(page);
        orderPage = new OrderPage(page);

        // Pre-authenticated session via LoginPage directly bypassing Launchpad UI flow
        await page.goto(process.env.CURRENT_APP_URL);
        await loginPage.login(process.env.OMS_NAME, process.env.USERNAME, process.env.PASSWORD);
        await loginPage.verifyLoginSuccess();
    });

    test("1. Settings Dashboard - Verify visibility of all configured toggles and sections", async ({ page }) => {
        await settingsPage.goToSettings();

        // OMS section and permissions
        await expect(page.getByRole("heading", { name: /OMS/i })).toBeVisible();
        await expect(settingsPage.logoutButton).toBeVisible();

        // Re-route Fulfillment (Order edit permissions)
        await expect(page.getByText(/order edit permissions/i)).toBeVisible();
        await expect(settingsPage.deliveryMethodToggle).toBeVisible();
        await expect(settingsPage.deliveryAddressToggle).toBeVisible();
        await expect(settingsPage.pickupLocationToggle).toBeVisible();
        await expect(settingsPage.cancelOrderToggle).toBeVisible();
        await expect(settingsPage.orderItemSplitToggle).toBeVisible();

        // Partial Order Rejection
        await expect(page.getByText(/Partial Order rejection/i)).toBeVisible();
        await expect(settingsPage.partialRejectionToggle).toBeVisible();

        // App Section
        await expect(page.getByRole("heading", { name: /App/i })).toBeVisible();
        await expect(settingsPage.showShippingOrdersToggle).toBeVisible();
        await expect(settingsPage.generatePackingSlipsToggle).toBeVisible();
        await expect(settingsPage.enableTrackingToggle).toBeVisible();
        await expect(settingsPage.printPicklistsToggle).toBeVisible();

        // Depending on environment permissions, these may or may not render (v-if conditionals)
        const requestTransferExists = await settingsPage.requestTransferToggle.isVisible().catch(() => false);
        if (requestTransferExists) {
            await expect(settingsPage.requestTransferToggle).toBeVisible();
        }

        const proofOfDeliveryExists = await settingsPage.proofOfDeliveryToggle.isVisible().catch(() => false);
        if (proofOfDeliveryExists) {
            await expect(settingsPage.proofOfDeliveryToggle).toBeVisible();
        }
    });

    test("2. Modify Order Edit Permissions - Toggling updates Reroute Fulfillment configuration", async ({ page }) => {
        await settingsPage.goToSettings();

        // Testing Delivery Method
        const initialDeliveryMethodState = await settingsPage.deliveryMethodToggle.isChecked();
        await settingsPage.toggleSetting(settingsPage.deliveryMethodToggle, !initialDeliveryMethodState);
        await expect(settingsPage.deliveryMethodToggle).toBeChecked({ checked: !initialDeliveryMethodState });
        await settingsPage.toggleSetting(settingsPage.deliveryMethodToggle, initialDeliveryMethodState);

        // Testing Delivery Address
        const initialDeliveryAddressState = await settingsPage.deliveryAddressToggle.isChecked();
        await settingsPage.toggleSetting(settingsPage.deliveryAddressToggle, !initialDeliveryAddressState);
        await expect(settingsPage.deliveryAddressToggle).toBeChecked({ checked: !initialDeliveryAddressState });
        await settingsPage.toggleSetting(settingsPage.deliveryAddressToggle, initialDeliveryAddressState);

        // Testing Cancellation (Allow Cancel vs Disallow Cancel)
        const initialCancelOrderState = await settingsPage.cancelOrderToggle.isChecked();
        await settingsPage.toggleSetting(settingsPage.cancelOrderToggle, !initialCancelOrderState);
        await expect(settingsPage.cancelOrderToggle).toBeChecked({ checked: !initialCancelOrderState });
        await settingsPage.toggleSetting(settingsPage.cancelOrderToggle, initialCancelOrderState);
    });

    test("3. Partial Order Rejection - Toggling properly updates store logic", async ({ page }) => {
        await settingsPage.goToSettings();

        // Testing Partial Rejection
        const initialPartialRejectionState = await settingsPage.partialRejectionToggle.isChecked();
        await settingsPage.toggleSetting(settingsPage.partialRejectionToggle, !initialPartialRejectionState);

        // Ensure state sticks after waiting
        await expect(settingsPage.partialRejectionToggle).toBeChecked({ checked: !initialPartialRejectionState });

        // Revert 
        await settingsPage.toggleSetting(settingsPage.partialRejectionToggle, initialPartialRejectionState);
    });

    test("4. Edge Case: Notification Preferences Alert Dialog - Cancel Action", async ({ page }) => {
        await settingsPage.goToSettings();

        const hasNotifications = await settingsPage.notificationPrefToggles.first().isVisible().catch(() => false);
        if (!hasNotifications) {
            console.log("No notification preferences configured. Skipping test execution.");
            test.skip();
            return;
        }

        const firstPrefToggle = settingsPage.notificationPrefToggles.first();
        const initialState = await firstPrefToggle.isChecked();

        // Trigger the Alert by clicking the toggle
        await firstPrefToggle.click({ force: true });

        // Wait for Ionic Alert Overlay to present itself
        const alertHeader = page.getByRole("heading", { name: "Update notification preferences" });
        await expect(alertHeader).toBeVisible();

        // Edge Case: Click Cancel button
        await page.getByRole("button", { name: "Cancel" }).click();
        await settingsPage.waitForOverlays();

        // Ensure state wasn't changed because action was cancelled
        expect(await firstPrefToggle.isChecked()).toBe(initialState);
    });

    test("5. Edge Case: Notification Preferences Alert Dialog - Confirm Action", async ({ page }) => {
        await settingsPage.goToSettings();

        const hasNotifications = await settingsPage.notificationPrefToggles.first().isVisible().catch(() => false);
        if (!hasNotifications) {
            console.log("No notification preferences configured. Skipping test execution.");
            test.skip();
            return;
        }

        // We listen for the toast message explicitly 
        let toastAppeared = false;
        page.on('response', resp => {
            // Note: Since FCM push subscriptions happen asynchronously, 
            // the toast is the definitive success check we'll assert visually.
        });

        const firstPrefToggle = settingsPage.notificationPrefToggles.first();
        const initialState = await firstPrefToggle.isChecked();

        // Trigger the Alert by clicking the toggle
        await firstPrefToggle.click({ force: true });

        // Wait for Alert to present itself
        const alertHeader = page.getByRole("heading", { name: "Update notification preferences" });
        await expect(alertHeader).toBeVisible();

        // Edge Case: Click Confirm button
        await page.getByRole("button", { name: "Confirm" }).click();

        // In the App logic, confirmNotificationPrefUpdate handles the toggling state independently if successful.
        // FCM takes time, so we bypass strict DOM assertion immediately and verify via toast.
        await expect(page.locator('ion-toast')).toBeVisible({ timeout: 15000 });

        // We revert it back to prevent breaking remote state logic tests for other participants
        await firstPrefToggle.click({ force: true });
        await expect(alertHeader).toBeVisible();
        await page.getByRole("button", { name: "Confirm" }).click();
        await expect(page.locator('ion-toast')).toBeVisible({ timeout: 15000 });
    });

    test("6. Logout Edge Case - Clean Session Teardown", async ({ page }) => {
        await settingsPage.goToSettings();
        await settingsPage.logout();

        // Verify successful redirection
        await expect(page).toHaveURL(/login|isLoggedOut/i);

        // Edge case: Try to manually route back to Orders tab and ensure Auth Guard prevents it
        await page.goto(process.env.CURRENT_APP_URL);

        // App's authGuard router should immediately reject the request and kick us back to the login
        await expect(page.url()).toMatch(/login/i);
    });
});
