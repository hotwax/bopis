const { test, expect } = require("@playwright/test");
const { LoginPage } = require("../pages/login.page");
const fs = require("fs");

test("Get DEV Settings Page Output structure", async ({ page }) => {
    await page.goto("https://bopis-dev.hotwax.io/tabs/orders");
    const loginPage = new LoginPage(page);
    await loginPage.login(process.env.OMS_NAME, process.env.USERNAME, process.env.PASSWORD);
    await loginPage.verifyLoginSuccess();

    await page.goto("https://bopis-dev.hotwax.io/tabs/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000); 

    const buttons = await page.locator("button, ion-button").allTextContents();
    console.log("Buttons found:", buttons.map(b => b.trim()).filter(b => b));
    
    // Check logout button directly
    const logoutBtnVisible = await page.getByTestId("logout-button").isVisible();
    console.log("Logout button by Test ID visible:", logoutBtnVisible);
    
    // Check using name/text
    const logoutBtnByText = await page.getByRole("button", { name: /Logout/i }).isVisible();
    console.log("Logout button by Role/Text visible:", logoutBtnByText);
});
