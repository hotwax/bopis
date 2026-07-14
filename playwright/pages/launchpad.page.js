import { expect } from "@playwright/test";

export class LaunchpadPage {
    constructor(page) {
        this.page = page;
        this.bopisAppCard = page.getByText("BOPIS", { exact: true });
    }

    async goto() {
        const url = `${process.env.LAUNCHPAD_URL}/home`;
        console.log(`Navigating to Launchpad: ${url}`);
        await this.page.goto(url);
        await this.page.waitForLoadState("networkidle");
        console.log("Launchpad loaded.");
    }

    async selectBopisApp() {
        console.log("Selecting BOPIS app...");
        await this.bopisAppCard.waitFor({ state: "visible" });
        await this.bopisAppCard.click();
        // Ionic transition wait
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);
        console.log("Successfully selected BOPIS app.");
    }
}
