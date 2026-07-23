const { LoginPage } = require("../pages/login.page");
const { LaunchpadPage } = require("../pages/launchpad.page");

async function loginToOrders(page) {
  await page.goto(process.env.CURRENT_APP_URL);
  const login = new LoginPage(page);
  await login.login(
    process.env.OMS_NAME,
    process.env.USERNAME,
    process.env.PASSWORD
  );
}

async function loginViaLaunchpad(page) {
  const launchpad = new LaunchpadPage(page);
  const login = new LoginPage(page);

  await launchpad.goto();
  await launchpad.selectBopisApp();
  await login.login(
    process.env.OMS_NAME,
    process.env.USERNAME,
    process.env.PASSWORD
  );
  await login.verifyLoginSuccess();
}

module.exports = { loginToOrders, loginViaLaunchpad };
