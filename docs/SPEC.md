**OnPoint — Project Spec**

Last updated: 2026-03-06

Overview
- **Purpose:** OnPoint is a browser-extension + web app project that detects checkout flows, recommends credit cards and rewards, and provides a dashboard and onboarding flow.
- **Primary parts:**
  - Extension (root `extension/`) — browser UI assets (built dashboard and onboarding pages)
  - Checkout detector (`extension/content/`) — scripts to detect checkout pages
  - OnPoint monorepo (`onpoint-cc-rewards/`) — backend API and frontend app

Repository layout (top-level)
- `extension/` — extension UI (manifest, background script, content scripts)
- `onpoint-cc-rewards/` — contains backend API and frontend app

Key components

1) Backend API (onpoint-cc-rewards/backend-api)
- Entry: `server.js`
- Routes: `routes/` - `authRoutes.js`, `cardRoutes.js`, `recommendationRoutes.js`.
- Controllers: `controllers/authController.js` handles authentication endpoints.
- Models: `models/` - `User.js`, `Card.js`, `Merchant.js` — Mongoose-like structures (or simple JS models).
- Services: `services/` - `cardService.js`, `recommendationService.js` encapsulate business logic.
- Database helpers: `database/connect.js`, `database/seedCards.js`, `database/seedMerchants.js`, plus `database/cards.json` and `merchants.json` for seeded data.
- Middleware: `middleware/auth.js` for protected routes.
- Utils: `utils/importCSV.js`, `utils/recommendation.js` for data import and recommendation logic.
- Tests: `tests/testCardService.js` for card service logic.

API surface (high-level)
- Auth routes: register/login, JWT-based auth (middleware enforced).
- Card routes: CRUD and search for card data (used by frontend to populate library).
- Recommendation routes: accept user/profile or transaction context and return recommended cards via `recommendationService`.

2) Frontend (onpoint-cc-rewards/frontend)
- Tech: Vite + React (JSX files in `src/`).
- Entry: `src/main.jsx` / `index.html` in `public/` for dev builds.
- Pages/components: Dashboard, Onboarding, CardLibrary, UserProfile, Header, Steps, FeatureCards, CreditCardList.
- Styling: CSS modules / global CSS in `src/styles` and component-level `.css` files.
- Build/dev scripts defined in `onpoint-cc-rewards/frontend/package.json`.

3) Extension (extension/)
- Static pages: `popup.html`, `dashboard.html`, `onboarding.html` plus `background.js` to coordinate extension runtime behavior.
- Assets: built JS/CSS bundles under `assets/` (likely output from a build pipeline).

Data models & storage
- Sample data in `onpoint-cc-rewards/backend-api/database/*.json` (cards, merchants).
- Backend uses an Express.js server with Mongoose/MongoDB for data persistence (see `database/connect.js`).

Tests & tooling
- Backend tests exist under `onpoint-cc-rewards/backend-api/tests/` (e.g., `testCardService.js`).
- Top-level `testScripts/` contains `run-tests.js` and `run-report.js` (integration/custom test runners):
  - `run-tests.js`: jsdom-based assertions against `extension/test-pages` — fast local/CI checks.
  - `run-report.js`: network scanner that fetches sites, runs detection, and emits `report.json` for ad-hoc sampling.
- Playwright E2E tests live in `testScripts/playwright` and are configured in `playwright.config.js` (testDir: `testScripts/playwright`, outputDir: `testScripts/test-results`).
- Root `package.json` provides convenience scripts: `test:e2e` (Playwright), `run-tests`, and `run-report`.

Run / Dev notes (assumptions — verify before running)
- Backend:
  - cd `onpoint-cc-rewards/backend-api`
  - `npm install` (or `pnpm`/`yarn` depending on tooling)
  - `npm start` or `node server.js`
- Frontend (app):
  - cd `onpoint-cc-rewards/frontend`
  - `npm install`
  - `npm run dev` (Vite) and `npm run build` for production
-- Extension / popup:
  - The extension consumes built bundles from `extension/dist/` (output of the frontend build).
  - Load `extension/manifest.json` as an unpacked extension in the browser for testing.

Known gaps & assumptions
- Exact package manager and scripts may vary between packages; check each `package.json` before running.
- Database: `database/connect.js` must be inspected to confirm if a live DB (Mongo) is required or if JSON seed files are used for local dev.
- Auth flows: presence of JWT-based middleware suggests protected endpoints; confirm env vars for secrets.

Recommendations / Next steps
- Verify backend `package.json` and `database/connect.js` to determine DB requirements and add sample `.env.example` if missing.
- Add simple `docs/README.md` with one-command dev startup for full stack (backend + frontend + extension popup dev flow).
- Add API spec (OpenAPI/Swagger) for `recommendationRoutes` and `cardRoutes` to aid frontend integration.
- Improve tests coverage: add integration tests for recommendation flow and end-to-end test loading extension + detector.

References
- Project docs folder: [docs](docs/)
- Backend API: onpoint-cc-rewards/backend-api/
- Frontend app: onpoint-cc-rewards/frontend/
- Extension: extension/

Contact
- For details, inspect `onpoint-cc-rewards/docs/architecture.md` and `README.md` files in each package.

Build outputs / artifact paths
- Vite build configuration places compiled frontend and popup bundles into the extension distribution folder: `extension/dist/`.
- Typical artifact layout after running the frontend/popup build(s):
  - `extension/dist/dashboard.html` — built dashboard HTML (entry for dashboard).
  - `extension/dist/onboarding.html` — built onboarding HTML (entry for popup/onboarding).
  - `extension/dist/assets/*` — hashed JS/CSS/image assets produced by Vite (e.g. `assets/index-<hash>.js`, `assets/index-<hash>.css`).
  - Source maps (if enabled) also placed under `extension/dist/assets/`.

Mapping: source -> build location
- `onpoint-cc-rewards/frontend/src/**` -> `extension/dist/assets/*.js`, `extension/dist/*.html` (dashboard, onboarding)
- `popup/src/**` -> builds via frontend Vite config -> `extension/dist/assets/*.js` and `extension/dist/onboarding.html`
- `extension/background.js` -> remains at `extension/background.js` (not built by Vite by default)
- `extension/manifest.json` -> packaging root (referencing `dist/onboarding.html` and content scripts)
- `content/detect-core.js` and `content/detect.js` -> included as content scripts at `content/detect-core.js` and `content/detect.js` (kept as-is)
- `extension/assets/` (existing) may contain prebuilt vendor bundles; current build targets `extension/dist/` so `extension/assets/` is separate from Vite output.
- Backend (`onpoint-cc-rewards/backend-api`) has no build step; server runtime files remain under `onpoint-cc-rewards/backend-api/` (start with `node server.js`).

How builds are invoked (from package scripts)
- Frontend app (builds both dashboard and onboarding pages):
  - `cd onpoint-cc-rewards/frontend`
  - `npm run build` -> uses Vite (`vite.config.js`) to compile React components and outputs to `extension/dist/`
  - Inputs: `dashboard.html` and `onboarding.html`
  - Outputs: `extension/dist/dashboard.html`, `extension/dist/onboarding.html`, and asset bundles in `extension/dist/assets/`

Packaging notes
- To load the extension locally for testing, ensure the `extension/dist/` output and the `extension/content/` scripts are present relative to `extension/manifest.json` paths. Load `extension/` as an unpacked extension in Chromium-based browsers.
- The manifest points to `dist/dashboard.html` (for options UI) and `dist/onboarding.html` (for popup UI).
- After building frontend (`npm run build` in `onpoint-cc-rewards/frontend`), ensure `extension/dist/` contains the compiled HTML and assets before loading the extension.

Build tree (visual)
Below is an ASCII tree that shows source locations and where files land after builds. Items marked with "(built)" are generated by Vite and placed in `extension/dist/` unless noted.

```
OnPoint/
├─ README.md
├─ extension/
│  ├─ manifest.json
│  ├─ background.js
│  ├─ package.json
│  ├─ content/
│  │  ├─ detect-core.js            (checkout detection script)
│  │  └─ detect.js
│  ├─ icons/                        (extension icons)
│  ├─ test-pages/
│  │  ├─ checkout-sample.html
│  │  └─ non-checkout.html
│  ├─ vite.svg
│  └─ dist/                         (Vite build output)
│     ├─ dashboard.html             (built)
│     ├─ onboarding.html            (built)
│     └─ assets/
│        ├─ main-<hash>.js          (built)
│        ├─ main-<hash>.css         (built)
│        └─ ...
├─ onpoint-cc-rewards/
│  ├─ package.json
│  ├─ backend-api/
│  │  ├─ package.json
│  │  ├─ README.md
│  │  ├─ server.js                 (Express server entry point)
│  │  ├─ controllers/
│  │  │  └─ authController.js
│  │  ├─ routes/
│  │  │  ├─ authRoutes.js
│  │  │  ├─ cardRoutes.js
│  │  │  └─ recommendationRoutes.js
│  │  ├─ middleware/
│  │  │  └─ auth.js
│  │  ├─ models/
│  │  │  ├─ Card.js
│  │  │  ├─ Merchant.js
│  │  │  └─ User.js
│  │  ├─ services/
│  │  │  ├─ cardService.js
│  │  │  └─ recommendationService.js
│  │  ├─ database/
│  │  │  ├─ cards.json
│  │  │  ├─ merchants.json
│  │  │  ├─ connect.js
│  │  │  ├─ seedCards.js
│  │  │  ├─ seedMerchants.js
│  │  │  ├─ importCards.js
│  │  │  └─ README.md
│  │  ├─ utils/
│  │  │  ├─ importCSV.js
│  │  │  └─ recommendation.js
│  │  └─ tests/
│  │     └─ testCardService.js
│  └─ frontend/
│     ├─ package.json
│     ├─ README.md
│     ├─ vite.config.js             (Vite config for building extension pages)
│     ├─ eslint.config.js
│     ├─ postcss.config.js
│     ├─ dashboard.html             (source page entry)
│     ├─ onboarding.html            (source page entry)
│     ├─ public/
│     └─ src/
│        ├─ main.jsx                (React entry point)
│        ├─ App.jsx
│        ├─ App.css
│        ├─ index.css
│        ├─ styles/
│        │  └─ globals.css
│        ├─ hooks/
│        │  └─ useDarkMode.js
│        ├─ pages/
│        │  ├─ Dashboard.jsx
│        │  ├─ Dashboard.css
│        │  ├─ CardLibrary.jsx
│        │  ├─ CardLibrary.css
│        │  ├─ UserProfile.jsx
│        │  └─ UserProfile.css
│        ├─ components/
│        │  ├─ Header/
│        │  │  ├─ Header.jsx
│        │  │  └─ Header.css
│        │  ├─ CardRecommendation/
│        │  │  └─ CardRecommendation.jsx
│        │  ├─ CheckoutDetector/
│        │  │  └─ CheckoutDetector.jsx
│        │  ├─ CheckoutSimulator/
│        │  │  └─ CheckoutSimulator.jsx
│        │  ├─ CreditCardList/
│        │  │  ├─ CreditCardList.jsx
│        │  │  └─ CreditCardList.css
│        │  ├─ FeatureCards/
│        │  │  ├─ FeatureCards.jsx
│        │  │  └─ FeatureCards.css
│        │  ├─ Onboarding/
│        │  │  ├─ Onboarding.jsx
│        │  │  └─ Onboarding.css
│        │  └─ Steps/
│        │     ├─ Steps.jsx
│        │     └─ Steps.css
│        └─ assets/
│  (build: `npm run build` in `onpoint-cc-rewards/frontend` -> outputs to `extension/dist/`)
└─ docs/
   ├─ SPEC.md                       (this file - architecture & build documentation)
   ├─ architecture.md
   ├─ epics.md
   └─ Instructions.txt
```


