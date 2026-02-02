# BOPIS

## 1. Repository Overview
- **Logical Name**: BOPIS ("Buy Online, Pick Up In Store").
- **Business Purpose**: This repository contains the HotWax BOPIS application used by store teams to manage buy-online-pickup-in-store and ship-to-store fulfillment. It provides a store-ops UI for finding pickup orders, creating picklists, packing/handing over shipments, and sending customer pickup notifications against an OMS backend.【F:src/services/OrderService.ts†L1-L378】

## 2. Core Responsibilities & Business Logic
- **Core domains/business rules**:
  - Order pickup and ship-to-store fulfillment (pickup orders, packed/completed shipments, shipment status transitions).【F:src/services/OrderService.ts†L7-L246】
  - Picklist creation and printing; packing slips and shipping labels for outbound handover flows.【F:src/services/OrderService.ts†L73-L227】
  - Order item rejection/cancel flows and pickup notifications to customers.【F:src/services/OrderService.ts†L66-L205】
  - Inventory visibility for pickup/shipping and store availability lookup.【F:src/services/StockService.ts†L1-L22】【F:src/services/UtilService.ts†L146-L217】
  - Product search and component lookups for store associates.【F:src/services/ProductService.ts†L1-L48】
  - User authentication, profile, permissions, and store-level configuration settings.【F:src/services/UserService.ts†L1-L190】【F:src/services/UtilService.ts†L46-L108】

- **Core business workflows implemented in this component**:
  - Retrieve pickup/ship-to-store orders, view shipment state, and progress shipments through pack/ship/handover events via OMS APIs.【F:src/services/OrderService.ts†L7-L246】
  - Generate and print picklists and packing materials required for fulfillment execution in-store.【F:src/services/OrderService.ts†L73-L227】
  - Trigger customer notifications when orders are scheduled for pickup or handed over.【F:src/services/OrderService.ts†L145-L205】
  - Check shipping inventory and view facility-level availability for rerouting or substitution decisions.【F:src/services/StockService.ts†L1-L24】

## 3. Dependencies & Architecture
- **Tech Stack**:
  - Vue 3 + Vue Router + Vuex for SPA UI state and routing.【F:package.json†L21-L39】
  - Ionic Vue + Capacitor for cross-platform (web/iOS/Android) delivery.【F:package.json†L15-L18】
  - HotWax OMS API SDK (`@hotwax/oms-api`) for OMS integration along with HotWax UI components.【F:package.json†L20-L21】
  - Firebase for hosting/notifications support.【F:package.json†L28-L28】

- **Dependency Map (App repo)**:
  - **HotWax OMS APIs** for order, shipment, inventory, and configuration operations (e.g., `oms/orders/pickup`, `poorti/shipments`, `poorti/getInventoryAvailableByFacility`, `storeLookup`).【F:src/services/OrderService.ts†L7-L246】【F:src/services/StockService.ts†L1-L24】【F:src/services/UtilService.ts†L199-L217】
  - **HotWax admin APIs** for user/profile and enumeration/configuration data (e.g., `admin/user/profile`, `admin/enumGroups`).【F:src/services/UserService.ts†L15-L69】【F:src/services/UtilService.ts†L6-L44】
  - **Shopify integration** for access token generation when linking to Shopify storefronts.【F:src/services/ShopifyService.ts†L1-L12】

## 4. Technical Context
- **Run locally**:
  1. Install dependencies: `npm install`
  2. Start the dev server: `ionic serve`.

- **Environment variables/configuration**:
  - `VUE_APP_BASE_URL` points to the HotWax OMS instance the app should connect to.
  - `VUE_APP_LOGIN_URL` defines the login portal for authentication.
  - `VUE_APP_VIEW_SIZE`, locale settings, and product/order identification settings tune list sizes and lookup behavior.
  - Firebase configuration (`VUE_APP_FIREBASE_CONFIG`, `VUE_APP_FIREBASE_VAPID_KEY`) enables notifications/hosting integration.
  - Product store setting enums (`VUE_APP_PRODUCT_STORE_SETTING_ENUMS`) define feature toggles for fulfillment behavior (e.g., picklist/packing slip printing).【F:.env.example†L1-L17】

---

![BOPIS app repo](https://user-images.githubusercontent.com/41404838/146546714-f95c73f9-ad24-483d-b037-0f6c33aa27aa.png)


# Prerequisite
Ionic CLI - If you don't have the ionic CLI installed refer [official documentation](https://ionicframework.com/docs/intro/cli) for the installation instructions.


# Build Notes (Users)

1. Download the app from [release](https://github.com/hotwax/bopis/releases) page and extract it.
2. Go to the app directory.
3. Run following command to download dependencies  
    `npm i`
4. Create a `.env` file by taking reference from the `.env.example` and set the `VUE_APP_BASE_URL` to the instance you want to connect the app.
5. To run the app in browser use the command: `ionic serve`


# Build Notes (Contributors)

1. Open a Terminal window
2. Clone app using the command: `git clone https://github.com/hotwax/bopis.git <repository-name>`
3. Go to the <repository-name> directory using command: `cd <repository-name>`
4. Run following command to download dependencies
    `npm i`
5. Create a `.env` file by taking reference from the `.env.example` and change the `VUE_APP_BASE_URL` to the instance you want to connect the app.
6. To run the app in browser use the command: `ionic serve`

## Firebase Hosting

We are using firebase hosting for the Bopis app deployment
Here are the steps to deploy app on firebase hosting

### Prerequisite

- [Firebase Cli](https://firebase.google.com/docs/cli) should be installed
- Firebase project should be created
- You should have access to firebase project

### Dev deployment

- Update the DEV instance url at .env.production file

- Build the application using following command
  `ionic build`

- Login into firebase
  `firebase login`

- Run following command to deploy to firebase hosting
  `firebase deploy --only hosting:sm-dev`

## How to build application in different environment or modes(staging, production, qa, etc)?

As there is a bug in Ionic cli due to which we cannot pass flag variables for commands (See [#4669](https://github.com/ionic-team/ionic-cli/issues/4642)). To build application in different modes we need to use vue-cli-service to build and then use the built app using capacitor copy command further.

Follow following instructions:

1. Manually build the application using vue-cli-service:
   npx vue-cli-service build --mode=sandbox

2. Copy web assets to the native project without building the app:
   ionic capacitor copy ios --no-build

3. Open the Android Studio / XCode project:
   ionic capacitor open android  
   ionic capacitor open ios

# Contribution Guideline

1. Fork the repository and clone it locally from the `main` branch. Before starting your work make sure it's up to date with current `main` branch.
2. Pick an issue from [here](https://github.com/hotwax/bopis/issues). Write in the issue comment that you want to pick it, if you can't assign yourself. **Please stay assigned to one issue at a time to not block others**.
3. Create a branch for your edits. Use the following branch naming conventions: **bopis/issue-number**.
4. Please add issue number to your commit message.
5. Propose a Pull Request to `main` branch containing issue number and issue title.
6. Use [Pull Request template](https://github.com/hotwax/bopis/blob/main/.github/PULL_REQUEST_TEMPLATE.md) (it's automatically added to each PR) and fill as much fields as possible to describe your solution.
7. Reference any relevant issues or other information in your PR.
8. Wait for review and adjust your PR according to it.
9. Congrats! Your PR should now be merged in!

If you can't handle some parts of the issue then please ask for help in the comment. If you have any problems during the implementation of some complex issue, feel free to implement just a part of it.

## Report a bug or request a feature

Always define the type of issue:
* Bug report
* Feature request

While writing issues, please be as specific as possible. All requests regarding support with implementation or application setup should be sent to.
# UI / UX Resources
You may find some useful resources for improving the UI / UX of the app <a href="https://www.figma.com/community/file/885791511781717756" target="_blank">here</a>.

# Join the community on Discord
If you have any questions or ideas feel free to join our <a href="https://discord.gg/SwpJnpdyg3" target="_blank">Discord channel</a>.
    
# The license

Bopis app is completely free and released under the Apache v2.0 License. Check <a href="https://github.com/hotwax/bopis/blob/main/LICENSE" target="_blank">LICENSE</a> for more details.
