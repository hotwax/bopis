import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { LoginPage } from "../pages/login.page";

const authFile = path.resolve("playwright/.auth/user.json");

setup("authenticate user once", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto(process.env.CURRENT_APP_URL);
  const login = new LoginPage(page);
  await login.login(
    process.env.OMS_NAME,
    process.env.USERNAME,
    process.env.PASSWORD,
  );
  await login.verifyLoginSuccess();
  await expect(page).toHaveURL(/\/tabs\/orders/i);

  await page.context().storageState({ path: authFile });
});
