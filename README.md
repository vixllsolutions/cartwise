# Cartwise — Smart Shopping & Household Spending Companion

Cartwise is a mobile-first prototype for the smart-trolley concept. It combines in-store barcode scanning and budget tracking with a demo spending review, simulated online-store connections, and a household ration planner.

## Project structure

```text
cartwise_bundle/
├── index.html              # Main application interface
├── style.css               # Responsive styling and motion
├── script.js               # Barcode cart, list import, budget and receipt logic
├── money-ration.js         # UPI review, platform demo connections and ration forecasts
├── README.md               # This guide
├── manifest.webmanifest    # Installable web app metadata
├── service-worker.js       # Offline app-shell caching
└── assets/
    ├── cartwise-logo.png
    ├── app-icon-192.png
    ├── app-icon-512.png
    ├── empty-cart.svg
    ├── shopping-basket.svg
    └── products/           # Sample product illustrations
```

## Run locally

1. Extract the ZIP.
2. Open a terminal inside `cartwise_bundle`.
3. Run `python -m http.server 8000`.
4. Open `http://localhost:8000`.

You can also upload the contents of this folder to GitHub Pages, Netlify or Vercel. Keep all files and the `assets` folder together. Camera scanning and PWA installation require HTTPS or localhost.

## Main app features

- Shopping budget, remaining balance and live cart total.
- Barcode entry, browser camera scanning where `BarcodeDetector` is supported, and a custom product fallback.
- Shopping list import from TXT/CSV, quantity-aware progress and manual entries.
- Downloadable CSV cart summary.
- Responsive layout, animated scroll reveals and PWA support.

## Money hub: UPI spending review

The page starts with fictional sample UPI transactions. Use the `Optional` / `Keep` control to decide which transactions you personally consider potentially reducible. The amount in `You could have kept` is simply the sum of transactions marked optional by the user. Cartwise does not automatically decide that a purchase was wasteful.

You can import a transaction CSV using the Import UPI CSV control. The minimum supported columns are `Merchant` and `Amount`. Optional columns are `Date`, `Description`, and `Category`. Example:

```csv
Date,Merchant,Description,Amount,Category
2026-11-05,Corner Chai Stop,Tea and snack,45,Food
2026-11-04,City Auto,Auto fare,96,Transport
```

The app parses the CSV locally in the browser and saves it in local storage on that device. It does not upload the statement to a server. Importing replaces the currently displayed sample transaction list after confirmation. Review the imported transactions and mark optional expenses yourself.

## Connected shopping platforms

Amazon, Myntra, Zomato, Swiggy and Blinkit appear with sample orders and spending totals. Their Connect / Disconnect controls only simulate an account connection for a prototype demonstration. They do not sign in to those services, fetch live orders, or collect account passwords.

A production version needs provider-approved integration methods, user consent, secure authentication/token storage, and a clear approach for providers that do not expose suitable order-history APIs. Avoid asking users to enter third-party passwords into Cartwise.

## Household ration planner

The Ration Planner tracks bulk household essentials. For each item, enter:

- Purchased quantity and unit (kg, litres, packs or units).
- Average daily consumption per person.
- Purchase amount and purchase date.
- Number of people in the household.

Estimated consumption is calculated as:

`Estimated consumed = days since purchase × daily use per person × household members`

`Estimated stock remaining = max(0, purchased quantity − estimated consumed)`

`Estimated days remaining = estimated stock remaining ÷ daily household use`

The page shows the expected restock date and highlights items estimated to run low within 14 days. The values are estimates, not sensor readings. Update the household size and consumption assumptions to improve the forecast.

The Enable alerts button can request browser notification permission. Notifications are checked when Cartwise is open or revisited; a static website cannot guarantee scheduled background notifications while fully closed. A production reminder service needs a backend scheduler and push-notification setup.

## Local data and privacy

Cart, budget, shopping list, UPI sample/import data, platform demo connection state, household size and ration items are stored in browser local storage. They are not synced between devices. Clearing browser site data may remove them. The app contains no bank credentials, payment processing or real financial account connection.

## Demo limitations and production requirements

- Product barcodes identify items but do not provide store-specific live selling prices. A real retailer catalogue and pricing feed are required.
- The current scanner uses the browser's native `BarcodeDetector` API, which is not available in every browser. Manual barcode entry or a Bluetooth scanner is the fallback.
- The in-store bill is an estimate and is not reconciled to a supermarket point-of-sale system.
- UPI activity and online platform order histories are demo/import data only. Real account connections require official integration routes, consent, security reviews and provider cooperation.
- The optional-spend insight is user-labelled. The prototype does not infer financial necessity or judge spending choices.
- Ration projections assume constant average consumption and do not automatically detect stock levels, wastage, guests or changes in routine.
- Browser notification reminders are not a reliable background scheduling service when the app is closed.

For a pilot, start with a small retailer catalogue and one approved data connection, validate spending forecasts with real household usage, then add more providers after privacy, security and integration requirements are resolved.
