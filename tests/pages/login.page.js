import { expect } from "@playwright/test";

export class LoginPage {
    constructor(page) {
        this.page = page;
        this.omsInput = page.getByRole("textbox", { name: /oms/i });
        this.nextButton = page.getByRole("button", { name: /next/i });
        this.usernameInput = page.getByRole("textbox", { name: /username|email|user/i });
        this.passwordInput = page.getByRole("textbox", { name: /password/i });
        this.loginButton = page.getByRole("button", { name: /login|sign in/i });
        this.loadingOverlay = page.locator("ion-loading, ion-backdrop, .loading-wrapper");
    }

    async waitForOverlays() {
        if (this.page.isClosed()) return;
        await this.loadingOverlay.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
    }


    async login(oms, username, password) {
        console.log(`Attempting login with OMS: ${oms}, Username: ${username}`);

        // Wait for page to stabilize
        await this.page.waitForLoadState("networkidle");
        console.log(`Current URL: ${this.page.url()}`);

        // Wait for either OMS input, Username input, or Orders page
        try {
            await Promise.race([
                this.omsInput.waitFor({ state: "visible", timeout: 10000 }),
                this.usernameInput.waitFor({ state: "visible", timeout: 10000 }),
                this.page.waitForURL(/login/, { timeout: 10000 }),
                this.page.waitForURL(/tabs\/orders/, { timeout: 10000 })
            ]);
        } catch (e) {
            console.log("Timeout or redirection detected. Current URL:", this.page.url());
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

        // await this.waitForOverlays();
        const isUserVisible = await this.usernameInput.isVisible();
        if (isUserVisible) {
            await this.usernameInput.fill(username);
            // await this.passwordInput.waitFor({ state: "visible" });
            await this.passwordInput.fill(password);
            // await this.waitForOverlays();
            await this.loginButton.click({ force: true });
            await this.page.waitForLoadState("networkidle");
            await this.page.waitForTimeout(2000);
        }
    }


    async verifyLoginSuccess() {
        const hasOmsInput = await this.omsInput.isVisible().catch(() => false);
        const hasUserInput = await this.usernameInput.isVisible().catch(() => false);
        const hasPasswordInput = await this.passwordInput.isVisible().catch(() => false);
        if (hasOmsInput || hasUserInput || hasPasswordInput) {
            throw new Error(`Login verification failed: still on auth form (${this.page.url()})`);
        }
    }
}
