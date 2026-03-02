import { expect } from "@playwright/test";

export class SettingsPage {
    constructor(page) {
        this.page = page;
        this.settingsTab = page.getByTestId("settings-tab-button");
        this.logoutButton = page.getByTestId("logout-button");
        this.facilitySwitcher = page.locator("dxp-facility-switcher");

        // Toggles using data-testid
        this.deliveryMethodToggle = page.getByTestId("delivery-method-toggle");
        this.deliveryAddressToggle = page.getByTestId("delivery-address-toggle");
        this.pickupLocationToggle = page.getByTestId("pickup-location-toggle");
        this.cancelOrderToggle = page.getByTestId("cancel-order-toggle");
        this.orderItemSplitToggle = page.getByTestId("order-item-split-toggle");
        this.partialRejectionToggle = page.getByTestId("partial-rejection-toggle");
        this.showShippingOrdersToggle = page.getByTestId("show-shipping-orders-toggle");
        this.generatePackingSlipsToggle = page.getByTestId("generate-packing-slips-toggle");
        this.enableTrackingToggle = page.getByTestId("enable-tracking-toggle");
        this.printPicklistsToggle = page.getByTestId("print-picklists-toggle");
        this.requestTransferToggle = page.getByTestId("request-transfer-toggle");
        this.proofOfDeliveryToggle = page.getByTestId("proof-of-delivery-toggle");

        // Notification Preferences
        this.notificationSection = page.getByText(/notification preference/i);
        this.notificationPrefToggles = page.getByTestId("notification-pref-toggle");

        this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper");
    }

    async waitForOverlays() {
        await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
        await this.page.waitForTimeout(1000);
    }

    async goToSettings() {
        console.log("Navigating to Settings tab...");
        await this.settingsTab.click({ force: true });
        await this.waitForOverlays();
        await expect(this.page).toHaveURL(/\/tabs\/settings/i);
    }

    async logout() {
        console.log("Logging out...");
        await this.logoutButton.click();
        await this.waitForOverlays();
        // Should redirect to launchpad or login
        await this.page.waitForURL(/login|isLoggedOut=true/i);
    }

    async toggleSetting(locator, expectedState) {
        const isChecked = await locator.isChecked();
        if (isChecked !== expectedState) {
            await locator.click({ force: true });
            await this.waitForOverlays();
            await expect(locator).toBeChecked({ checked: expectedState });
        }
    }
}
