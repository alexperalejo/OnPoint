# OnPoint — User Acceptance Testing (UAT) Script

**Project:** OnPoint Chrome Extension  
**Document Version:** 1.0  
**Date:** April 10, 2026  
**Sprint / Release:** MVP v1.0  
**Prepared By:** Team INH  
**Status:** Ready for UAT  

---

## Section 1 — Onboarding Flow

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC001 | Validate that the OnPoint extension loads the onboarding screen on first install | Chrome browser open; extension not previously installed | 1. Open Chrome → `chrome://extensions` 2. Enable Developer Mode and click "Load unpacked" 3. Select the `extension/` folder 4. Click the OnPoint icon in the toolbar | Onboarding welcome screen is displayed with the OnPoint value proposition and a "Get Started" call-to-action | | Pass / Fail |
| TC002 | Validate that the onboarding flow guides the user through all setup steps | Extension installed; onboarding screen visible (TC001 passed) | 1. Click "Get Started" on the welcome screen 2. Progress through each onboarding step 3. Observe step indicators and navigation controls | Each step is shown in sequence (welcome → card import → confirmation); progress indicators update correctly; user can navigate forward and back | | Pass / Fail |
| TC003 | Validate that a user can add their first credit card during onboarding | User is on the card import step of onboarding | 1. Click "Add Card" or the equivalent add action 2. Enter card nickname, reward category, and cashback rate 3. Submit the card form | Card is added and displayed in the card preview list; no error messages appear | | Pass / Fail |
| TC004 | Validate that completing onboarding transitions the user to the active dashboard | At least one card added; user is on the confirmation step | 1. Review the confirmation screen showing the added card(s) 2. Click "Finish" or "Start Using OnPoint" 3. Observe the resulting screen | User is taken to the main dashboard; card library shows the added card; detector status shows as active | | Pass / Fail |

---

## Section 2 — Checkout Page Detection

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC005 | Validate that the extension detects a standard checkout page and displays the detection indicator | Extension installed and active; at least one card in wallet | 1. Open `extension/test-pages/checkout-sample.html` in Chrome with the extension loaded 2. Wait up to 5 seconds 3. Observe the extension icon and any popup UI | Extension badge or popup indicates a checkout has been detected; no console errors | | Pass / Fail |
| TC006 | Validate that the extension does NOT trigger on a non-checkout page | Extension installed and active | 1. Open `extension/test-pages/non-checkout.html` 2. Wait 5 seconds 3. Observe the extension icon and popup | No checkout detection indicator appears; extension remains in idle state | | Pass / Fail |
| TC007 | Validate that the extension detects a EUR-currency checkout page | Extension installed and active | 1. Open `extension/test-pages/checkout-sample-eur.html` 2. Wait up to 5 seconds 3. Observe the extension popup | Extension detects the checkout page regardless of currency; detection indicator appears normally | | Pass / Fail |
| TC008 | Validate that the extension detects a checkout on a live Shopify-based storefront | Extension installed; internet connection available | 1. Navigate to a publicly accessible Shopify store 2. Add an item to the cart and proceed to checkout 3. Wait up to 5 seconds on the checkout page | Extension detects the Shopify checkout and shows the recommendation popup or badge | | Pass / Fail |

---

## Section 3 — Card Recommendation Engine

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC009 | Validate that a card recommendation is generated within 2 seconds of checkout detection | Extension active; at least one card in wallet; `checkout-sample.html` loaded | 1. Open `extension/test-pages/checkout-sample.html` 2. Note the time when the page loads 3. Observe when the recommendation popup appears | Recommendation popup appears within 2 seconds of page load; a card name and estimated reward are displayed | | Pass / Fail |
| TC010 | Validate that the recommended card matches the highest reward rate for the detected merchant category | Two or more cards with different reward rates in wallet; merchant matches a known category (e.g., Shopping) | 1. Add two cards — Card A (3% shopping) and Card B (1% shopping) 2. Open a shopping checkout page 3. Observe which card is recommended as the primary pick | Card A (3% cashback) is recommended as the top pick; Card B appears as an alternative | | Pass / Fail |
| TC011 | Validate that the recommendation popup displays the card image, name, and estimated reward amount | Checkout detected; recommendation generated | 1. Open a checkout page with the extension active 2. Wait for the recommendation popup 3. Inspect the popup contents | Popup shows: card name, card image (or placeholder), and estimated cashback/reward amount for the purchase | | Pass / Fail |
| TC012 | Validate that alternative card recommendations are displayed below the primary pick | Three or more cards in wallet; checkout detected | 1. Open a checkout page 2. Wait for the recommendation popup 3. Scroll or expand the alternatives section | At least one alternative card is shown below the primary recommendation with its reward estimate | | Pass / Fail |

---

## Section 4 — Recommendation Display & Interaction

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC013 | Validate that the user can accept a card recommendation from the popup | Recommendation popup visible on a checkout page | 1. Open a checkout page with the extension active 2. Wait for the recommendation popup 3. Click "Use This Card" (or equivalent accept action) | Popup acknowledges the selection; no errors; UI updates to reflect the accepted card | | Pass / Fail |
| TC014 | Validate that the user can dismiss/skip the recommendation popup | Recommendation popup visible | 1. Open a checkout page with a visible recommendation popup 2. Click "Skip" or dismiss the popup (×) 3. Observe the page state | Popup closes without error; checkout page remains fully functional | | Pass / Fail |
| TC015 | Validate that the user can add a new card directly from the recommendation popup | Recommendation popup visible; card wallet has at least one card | 1. Click "Add New Card" within the recommendation popup 2. Complete the add-card form 3. Submit and observe | New card is added to the wallet and appears in the alternatives section of the popup or card library | | Pass / Fail |
| TC016 | Validate that the recommendation popup does not degrade page performance | Extension active; checkout page loaded | 1. Open a checkout page with the extension active 2. Open Chrome DevTools → Performance tab 3. Record while the popup appears and is interacted with | Page load impact is less than 2 seconds; no layout jank observed in the performance trace | | Pass / Fail |

---

## Section 5 — Card Management

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC017 | Validate that a user can manually add a new credit card to their wallet | User is on the Card Library / dashboard; onboarding completed | 1. Navigate to the Card Library section 2. Click "Add Card" 3. Enter card nickname, reward category, and cashback percentage 4. Click Save | New card appears in the card list immediately; data is persisted in `chrome.storage.local` | | Pass / Fail |
| TC018 | Validate that card data persists after the browser is restarted | At least one card added to the wallet | 1. Add a card to the wallet 2. Close and reopen Chrome 3. Open the OnPoint popup and navigate to Card Library | Previously added card(s) are still present in the card library after restart | | Pass / Fail |
| TC019 | Validate that a user can edit an existing card's details | At least one card in the wallet | 1. Open Card Library 2. Click "Edit" on an existing card 3. Change the nickname and cashback rate 4. Click Save | Card details are updated in the library; updated values persist after popup close/reopen | | Pass / Fail |
| TC020 | Validate that a user can delete a card from their wallet | At least two cards in the wallet | 1. Open Card Library 2. Click "Delete" on one card 3. Confirm the deletion prompt 4. Verify the card list | The deleted card is removed from the library and does not reappear after refresh | | Pass / Fail |
| TC021 | Validate that the user can search for a card by name in the card library | Three or more cards in the wallet with different names | 1. Open Card Library 2. Type a partial card name into the search field 3. Observe the results | Only cards matching the search term are displayed; results update in real time as the user types | | Pass / Fail |
| TC022 | Validate that the user can filter cards by reward category | Cards with different categories (e.g., Dining, Travel, Shopping) exist in wallet | 1. Open Card Library 2. Select a category filter (e.g., "Dining") 3. Observe the filtered results | Only cards tagged with the selected category are displayed | | Pass / Fail |

---

## Section 6 — Purchase Tracking (Detection Only)

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC023 | Validate that the extension detects a purchase completion event on a confirmation page | Extension installed and active | 1. Open `extension/test-pages/purchase-completion-sample.html` 2. Wait up to 5 seconds 3. Observe extension popup or local storage for a purchase record | Extension detects the purchase confirmation; a purchase record (merchant, timestamp) is stored in `chrome.storage.local` | | Pass / Fail |
| TC024 | Validate that purchase records include merchant name, amount (if available), and timestamp | Purchase completion detected (TC023 passed) | 1. Open Chrome DevTools → Application → Storage → chrome.storage.local 2. Inspect the purchase history entry created by TC023 | Record contains at minimum: merchant identifier, timestamp; amount field present (may be null if not detectable) | | Pass / Fail |
| TC025 | Validate that the extension does NOT record a purchase event on a non-confirmation page | Extension installed; no prior purchase events in storage | 1. Open `extension/test-pages/checkout-sample.html` (not a confirmation page) 2. Wait 5 seconds 3. Inspect `chrome.storage.local` for purchase records | No new purchase record is created; storage state unchanged from baseline | | Pass / Fail |

---

## Section 7 — Dashboard & UI

| ID | Description | Preconditions | Steps | Expected Results | Actual Results | Status |
|----|-------------|---------------|-------|-----------------|----------------|--------|
| TC026 | Validate that the dashboard loads and displays the card library summary | Onboarding completed; at least one card in wallet | 1. Click the OnPoint extension icon in Chrome 2. Navigate to the Dashboard view 3. Observe the card summary section | Dashboard loads without errors; card count and card names from the wallet are displayed | | Pass / Fail |
| TC027 | Validate that the detector status indicator on the dashboard reflects the current detection state | Dashboard is open; extension active | 1. Open dashboard on a non-checkout page — note status 2. Open a checkout page in another tab 3. Switch back to the dashboard and observe status | Status changes from "Idle" to "Checkout Detected" (or equivalent) when a checkout tab is active | | Pass / Fail |
| TC028 | Validate that the User Profile page displays stored user preferences | Onboarding completed; profile data present | 1. Click the OnPoint extension icon 2. Navigate to User Profile 3. Review displayed information | User Profile page loads and displays any stored preferences without errors | | Pass / Fail |
| TC029 | Validate that the extension UI renders correctly in dark mode | Extension installed; `useDarkMode` hook present in codebase | 1. Enable dark mode in Chrome (Settings → Appearance) 2. Open the OnPoint popup 3. Observe all UI elements: text, buttons, backgrounds | All UI elements are readable and contrast-compliant in dark mode; no unstyled elements visible | | Pass / Fail |
| TC030 | Validate that the extension UI displays correctly when no cards have been added to the wallet | Extension installed; card wallet is empty | 1. Remove all cards from the wallet (or install fresh) 2. Open a checkout page 3. Observe the popup/recommendation UI | An empty-state message is displayed (e.g., "Add a card to get recommendations"); no crashes or blank screens | | Pass / Fail |

---

## Test Environment

- **Browser:** Chrome / Chromium (desktop), extension loaded as unpacked via `chrome://extensions`
- **Extension path:** `extension/` (root of workspace)
- **Test pages:** `extension/test-pages/` — `checkout-sample.html`, `checkout-sample-eur.html`, `non-checkout.html`, `purchase-completion-sample.html`
- **Backend:** Optional — card/merchant data may be seeded from `database/cards.json` and `database/merchants.json`
- **Chrome version required:** 90+

## Out of Scope for MVP UAT

User accounts / login, push notifications, ML recommendations, Firefox / Safari support, mobile responsive design, encryption of card data, spending analytics dashboard.

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |
