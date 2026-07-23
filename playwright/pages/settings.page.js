import { expect } from "@playwright/test";

export class SettingsPage {
    constructor(page) {
        this.page = page;
        this.settingsTab = page.getByTestId("settings-tab-button");
        this.logoutButton = page.locator('ion-button', { hasText: /Logout/i }).first();
        this.facilitySwitcher = page.getByTestId("facility-switcher");

        this.deliveryMethodToggle = page.locator('ion-toggle', { hasText: /Delivery method/i });
        this.deliveryAddressToggle = page.locator('ion-toggle', { hasText: /Delivery address/i });
        this.pickupLocationToggle = page.locator('ion-toggle', { hasText: /Pick up location/i });
        this.cancelOrderToggle = page.locator('ion-toggle', { hasText: /Cancel order before fulfillment/i });
        this.orderItemSplitToggle = page.locator('ion-toggle', { hasText: /Order item split/i });
        this.partialRejectionToggle = page.locator('ion-toggle', { hasText: /Allow partial rejection/i });
        this.showShippingOrdersToggle = page.locator('ion-toggle', { hasText: /Show shipping orders/i });
        this.generatePackingSlipsToggle = page.locator('ion-toggle', { hasText: /Generate packing slips/i });
        this.enableTrackingToggle = page.locator('ion-toggle', { hasText: /Enable tracking/i });
        this.printPicklistsToggle = page.locator('ion-toggle', { hasText: /Print picklists/i });
        this.requestTransferToggle = page.locator('ion-toggle', { hasText: /Show Request Transfer/i });
        this.proofOfDeliveryToggle = page.locator('ion-toggle', { hasText: /Show proof of delivery/i });

        // Notification Preferences
        this.notificationSection = page.getByText(/notification preference/i);
        this.notificationPrefToggles = page.getByTestId(/notification-pref-.*-toggle/);

        this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper");
    }

    async waitForOverlays() {
        await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    }

    async goToSettings() {
        console.log("Navigating to Settings tab...");
        await this.waitForOverlays();
        await this.settingsTab.click({ force: true });
        await this.waitForOverlays();
        await expect(this.page).toHaveURL(/\/tabs\/settings/i);
    }

    // Returns array of visible facility names (best-effort parsing of the facility switcher contents)
    async getFacilityNames() {
        // Try to read inner text of the switcher container and split into lines
        try {
            const text = await this.facilitySwitcher.innerText({ timeout: 5000 }).catch(() => '');
            if (!text) return [];
            const lines = text.split(/\n|\r/).map(s => s.trim()).filter(Boolean);
            // Filter out common non-facility labels
            const filtered = lines.filter(l => !/settings|logout|oms|order|notification|app|version/i.test(l));
            return filtered;
        } catch (err) {
            return [];
        }
    }

    async isFacilityPresent(facilityName) {
        const names = await this.getFacilityNames();
        return names.some(n => n.toLowerCase().includes(facilityName.toLowerCase()));
    }

    async selectFacilityByName(facilityName) {
        // Try clicking by visible text inside the switcher container
        const locator = this.facilitySwitcher.locator(`text=${facilityName}`);
        if (await locator.isVisible().catch(() => false)) {
            await locator.click({ force: true });
            await this.waitForOverlays();
            return true;
        }
        // Fallback: try a generic click on any element containing the text
        const generic = this.page.getByText(facilityName, { exact: false }).first();
        if (await generic.isVisible().catch(() => false)) {
            await generic.click({ force: true });
            await this.waitForOverlays();
            return true;
        }
        return false;
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
