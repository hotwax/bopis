/**
 * Config Helper - Environment and Setup Configuration
 *
 * This file helps manage environment-specific configurations for different
 * app deployments (dev, staging, production).
 *
 * Note: Launchpad URL is the same across all environments.
 *       App URLs (BOPIS, OMS) change based on the server.
 */

// Launchpad URL - Same for all environments
const LAUNCHPAD_URL = "https://launchpad.hotwax.io";

// Environment configuration for app URLs
const environments = {
  dev: {
    launchpadUrl: LAUNCHPAD_URL,
    bopisUrl: "https://bopis-dev.hotwax.io",
    omsUrl: "https://oms-dev.hotwax.io",
  },
  // UAT environment - uncomment when needed
  // uat: {
  //   launchpadUrl: LAUNCHPAD_URL,
  //   bopisUrl: "https://bopis-uat.hotwax.io",
  //   omsUrl: "https://oms-uat.hotwax.io",
  // },
  // staging: {
  //   launchpadUrl: LAUNCHPAD_URL,
  //   bopisUrl: "https://bopis-staging.hotwax.io",
  //   omsUrl: "https://oms-staging.hotwax.io",
  // },
  // production: {
  //   launchpadUrl: LAUNCHPAD_URL,
  //   bopisUrl: "https://bopis.hotwax.io",
  //   omsUrl: "https://oms.hotwax.io",
  // },
};

// Test user accounts
const testUsers = {
  admin: {
    username: process.env.BOPIS_USERNAME,
    password: process.env.BOPIS_PASSWORD,
    oms: process.env.OMS_NAME,

    permissions: ["admin", "user"],
  },
  manager: {
    username: process.env.MANAGER_USERNAME,
    password: process.env.MANAGER_PASSWORD,
    oms: process.env.OMS_NAME,
    permissions: ["manager", "user"],
  },
  regular: {
    username: process.env.REGULAR_USERNAME,
    password: process.env.REGULAR_PASSWORD,
    oms: process.env.OMS_NAME,
    permissions: ["user"],
  },

};

/**
 * Get current environment configuration
 * @returns {object} Environment URLs
 */
function getEnvironment() {
  const env = process.env.TEST_ENV || "dev";
  if (!environments[env]) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return environments[env];
}

/**
 * Get test user configuration
 * @param {string} userType - User type (admin, manager, regular)
 * @returns {object} User credentials and OMS
 */
function getTestUser(userType = "admin") {
  if (!testUsers[userType]) {
    throw new Error(`Unknown user type: ${userType}`);
  }
  return testUsers[userType];
}

/**
 * Build auth file path for different users/environments
 * Allows multiple authenticated sessions to be saved
 * @example
 * getAuthFilePath("dev", "admin") → "auth-dev-admin.json"
 * getAuthFilePath("staging", "manager") → "auth-staging-manager.json"
 */
function getAuthFilePath(environment, userType = "admin") {
  return `auth-${environment}-${userType}.json`;
}

module.exports = {
  environments,
  testUsers,
  getEnvironment,
  getTestUser,
  getAuthFilePath,
};
