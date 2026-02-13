const { test: baseTest, expect } = require("@playwright/test");
const path = require("path");
const { getEnvironment } = require("./config");

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });


// Set default app URL if not provided via environment
process.env.LAUNCHPAD_URL = process.env.LAUNCHPAD_URL || "https://launchpad.hotwax.io";
process.env.BOPIS_ORDERS_URL = process.env.BOPIS_ORDERS_URL || "https://bopis-dev.hotwax.io/tabs/orders";
process.env.CURRENT_APP_URL = process.env.CURRENT_APP_URL || process.env.BOPIS_ORDERS_URL;
process.env.OMS_NAME = process.env.OMS_NAME;

process.env.BOPIS_USERNAME = process.env.BOPIS_USERNAME;
process.env.BOPIS_PASSWORD = process.env.BOPIS_PASSWORD;



/**
 * Custom test fixture that loads authenticated session
 *
 * Features:
 * - Automatically loads authenticated session before tests
 * - Supports multiple environments (dev, staging, production)
 * - Supports multiple users (admin, manager, regular)
 * - Session file naming: auth-{env}-{user}.json
 *
 * Usage:
 * const { test } = require('./fixtures');
 *
 * test("My authenticated test", async ({ page, env }) => {
 *   // Already logged in
 *   console.log("Testing in:", env.launchpadUrl);
 * });
 */

/**
 * Custom test fixture
 * - Extends Playwright test
 * - Provides environment config
 */
const test = baseTest.extend({
  // Provide environment config to tests
  env: async ({ }, use) => {
    const env = getEnvironment();
    await use(env);
  },
});

module.exports = { test, expect };
