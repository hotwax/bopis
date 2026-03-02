const { test, expect } = require("@playwright/test");
const { LoginPage } = require("../pages/login.page");
const fs = require("fs");
test("Debug what is rendered", async ({ page }) => {
    // We navigate to /tabs/orders directly
    await page.goto("http://localhost:8080/tabs/orders");
    const loginPage = new LoginPage(page);
    await loginPage.login(process.env.OMS_NAME, process.env.USERNAME, process.env.PASSWORD);
    await loginPage.verifyLoginSuccess();
    
    // We take a snapshot of the fully loaded DOM
    await page.waitForTimeout(5000);
    const content = await page.content();
    fs.writeFileSync("debugxyz.html", content);
});
