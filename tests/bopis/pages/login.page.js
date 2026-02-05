import { expect } from "@playwright/test";

export class LoginPage {
    constructor(page) {
        this.page = page;
        this.omsInput = page.getByLabel("OMS");
        this.nextButton = page.getByRole("button", { name: /next/i });
        this.usernameInput = page.getByLabel(/username|email|user/i);
        this.passwordInput = page.getByLabel(/password/i);
        this.loginButton = page.getByRole("button", { name: /login|sign in/i });
        this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper");
    }

    async waitForOverlays() {
        await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
        await this.page.waitForTimeout(1000);
    }


    async login(oms, username, password) {
        console.log(`Attempting login with OMS: ${oms}, Username: ${username}`);

        // Wait for page to stabilize
        await this.page.waitForLoadState("networkidle");
        console.log(`Current URL: ${this.page.url()}`);

        // If already logged in, skip
        if (this.page.url().includes("tabs/orders")) {
            console.log("Already on Orders page, skipping login steps.");
            return;
        }

        // Wait for either OMS input, Username input, or Orders page
        try {
            await Promise.race([
                this.omsInput.waitFor({ state: "visible", timeout: 10000 }),
                this.usernameInput.waitFor({ state: "visible", timeout: 10000 }),
                this.page.waitForURL(/tabs\/orders/, { timeout: 10000 })
            ]);
        } catch (e) {
            console.log("Timeout or redirection detected. Current URL:", this.page.url());
        }

        if (this.page.url().includes("tabs/orders")) {
            console.log("Redirected to Orders page, skipping login.");
            return;
        }

        // OMS Selection if visible
        if (await this.omsInput.isVisible()) {
            console.log("OMS input is visible, filling it...");
            await this.omsInput.fill(oms);
            await this.waitForOverlays();
            await this.nextButton.click({ force: true });
            await this.page.waitForLoadState("networkidle");
            await this.page.waitForTimeout(2000);
        }

        // Authentication (skip if already on orders)
        if (this.page.url().includes("tabs/orders")) return;

        await this.waitForOverlays();
        const isUserVisible = await this.usernameInput.isVisible();
        if (isUserVisible) {
            await this.usernameInput.fill(username);
            await this.passwordInput.waitFor({ state: "visible" });
            await this.passwordInput.fill(password);
            await this.waitForOverlays();
            await this.loginButton.click({ force: true });
            await this.page.waitForLoadState("networkidle");
            await this.page.waitForTimeout(2000);
        }
    }


    async verifyLoginSuccess() {
        await expect(this.page).not.toHaveURL(/login/i);
    }
}
