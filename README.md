# BOPIS

## 1. Repository Overview
- **Logical Name**: **BOPIS** — “Buy Online, Pick Up In Store.” It is not a Sanskrit word.
- **Business Purpose**: This repository contains the store-associate-facing BOPIS application used to manage pickup and ship-to-store fulfillment flows for retail orders. It connects to HotWax OMS APIs to fetch orders, generate picklists, pack/ship items, and send customer notifications for pickup readiness and handover events.

## 2. Core Responsibilities & Business Logic
- **Order pickup management**: Fetches open pickup orders and detailed order data to drive the in-store picking workflow.
- **Picklist generation & printing**: Creates fulfillment waves (picklists) and prints picklists for associate workflows.
- **Packing & shipping execution**: Packs and ships shipments, including printing packing slips and shipping labels when required.
- **Ship-to-store workflows**: Converts orders to ship-to-store, tracks arrival, and completes handover for store pickup of transferred inventory.
- **Pickup notifications & handover**: Sends ready-for-pickup and handover notifications to customers.
- **Order exceptions**: Cancels or rejects items when fulfillment cannot proceed.
- **Gift card activation enrichment**: Pulls gift card activation info to enrich order item fulfillment details.

## 3. Dependencies & Architecture
- **Tech Stack**:
  - **Frontend**: Vue 3, Vue Router, Vuex, TypeScript, Ionic Vue, Capacitor.
  - **Libraries/Utilities**: Luxon, Firebase, @hotwax/oms-api, @hotwax/dxp-components, @hotwax/apps-theme.

- **Dependency Map (App Repo)**:
  - **HotWax OMS APIs**: Primary backend for orders, shipments, picklists, notifications, and fulfillment operations (e.g., `/oms/*`, `/poorti/*`).
  - **HotWax OMS admin/user services**: User profile, permissions, and product store settings via `/admin/*` and `performFind` endpoints.
  - **Document services**: Printing picklists, packing slips, and shipping labels via `/fop/*` and `LabelAndPackingSlip.pdf` endpoints.
  - **Solr/performFind**: Search and data access for OMS entities via `/solr-query` and `performFind`.
  - **Shopify**: Access token generation for Shopify integrations via `/generateShopifyAccessToken` endpoint.

## 4. Technical Context
- **Run locally**:
  1. Install dependencies: `npm install`.
  2. Copy `.env.example` to `.env` and configure required values (especially `VUE_APP_BASE_URL`).
  3. Start the dev server: `npm run serve` (or use the Ionic CLI if preferred).

- **Environment configuration**:
  - Core runtime settings live in `.env` (see `.env.example`). Key variables include:
    - `VUE_APP_BASE_URL` (OMS base URL), `VUE_APP_LOGIN_URL`, `VUE_APP_VIEW_SIZE`, and locale/currency settings.
    - Firebase integration settings for notifications/hosting: `VUE_APP_FIREBASE_CONFIG`, `VUE_APP_FIREBASE_VAPID_KEY`.
    - Product store settings enums that control BOPIS behavior (tracking, picklists, packing slips, etc.).

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
