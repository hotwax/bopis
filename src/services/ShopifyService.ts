import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";

class ShopifyService {
  private app: any;

  public initialize(apiKey: string, host: string) {
    if (!this.app) {
      this.app = createApp({
        apiKey,
        host,
      });
    }
  }

  public getApp() {
    return this.app;
  }

  public redirect(url: string) {
    if (this.app) {
      Redirect.create(this.app).dispatch(Redirect.Action.REMOTE, url);
    }
  }
}

export default new ShopifyService();