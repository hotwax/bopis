import { test, expect } from "@playwright/test";

test.describe("Basic Operations", () => {
  test("Open Playwright Website and Click Get Started Link", async ({
    page,
  }) => {
    // Step 1: Open Playwright website
    await page.goto("https://playwright.dev");

    // Verify homepage loaded
    await expect(page).toHaveTitle(/Playwright/);

    // Step 2: Click "Get Started" link
    
    const getStartedLink = page.getByRole("link", { name: "Get Started" });
    await expect(getStartedLink).toBeVisible();
    await getStartedLink.click();

    // Step 3: Verify navigation to installation page
    await expect(page).toHaveURL(/intro/);
    await expect(
      page.getByRole("heading", { name: "Installation" }),
    ).toBeVisible();
  });
});
