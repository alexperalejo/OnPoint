# OnPoint — Finalized MVP Product Scope

**Document Version:** 1.0  
**Last Updated:** March 27, 2026  
**Status:** Final MVP Specification  

---

## Executive Summary

OnPoint is a Chrome extension-based real-time credit card recommendation system that detects shopping checkout pages and recommends the most rewarding credit card for the current purchase. The MVP focuses on core detection, recommendation, and card management capabilities, delivering immediate value to users by optimizing their cashback and rewards selection at the point of purchase.

---

## Product Vision

To maximize user financial benefits at every purchase by providing intelligent, real-time credit card recommendations directly at checkout, eliminating the need for users to manually compare card benefits during shopping.

---

## MVP Goals

1. **Detection Accuracy** – Consistently identify checkout pages with high reliability
2. **Recommendation Quality** – Deliver accurate, personalized card recommendations based on merchant and category matching
3. **User Control** – Enable users to manage their card library and override recommendations
4. **System Reliability** – Operate without performance degradation on any shopping website
5. **Simplified Onboarding** – Get users set up with their card data quickly

---

## Core Features (In Scope)

### 1. Checkout Page Detection
- Auto-detect checkout pages across major e-commerce platforms
- Recognize payment form fields (card input, expiry, merchant info)
- Support common checkout flow patterns (single-page, multi-step, modal-based)
- Display detection indicator in browser extension UI

**Design Choice:** Client-side content script detection for privacy and speed; no server-side page analysis required.

### 2. Card Recommendation Engine
- Match detected merchant to internal merchant database
- Apply card benefit rules (cashback %, category multipliers)
- Rank cards by estimated reward value for the current purchase
- Return top card recommendation with estimated reward amount
- Support multiple recommendation tiers (primary + alternatives)

**Design Choice:** Rule-based recommendation system using stored card attributes and merchant data; no ML/AI for MVP.

### 3. Recommendation Display & Interaction
- Show recommendation popup/modal when checkout is detected
- Display recommended card image, name, reward estimate
- Allow user to:
  - Accept recommendation
  - Skip recommendation
  - Add new card to wallet
  - View alternative recommendations
- Mobile-friendly popup interface

**Design Choice:** Extension popup UI (dashboard bundle built into extension); no external web tabs.

### 4. Card Management
- Add credit cards manually to personal wallet
- View all cards in card library
- Delete cars from wallet
- Edit card details (nickname, primary status, benefits)
- Filter and search cards by name or category
- Lightweight client-side encryption for stored card metadata (e.g., card nickname, reward categories) to reduce exposure risk

**Design Choice:** Local browser storage (`chrome.storage.local`) for MVP; no account or cloud sync.

### 5. Onboarding Flow
- Welcome screen introducing OnPoint value proposition
- Optional demo or tutorial
- Quick card import interface (manual entry)
- Confirmation screen with card library preview
- Seamless transition to active extension with detector enabled

**Design Choice:** Single-page onboarding; no complex authentication or email verification.

### 6. Browser Extension Infrastructure
- Background script for message routing and event coordination
- Content scripts for checkout page detection
- Extension popup for recommendations and card management
- Dashboard page accessible from extension icon

**Design Choice:** Modular message-based architecture for clean separation between detector, recommendation, and UI components.

### 7. Purchase Tracking (Detection Only)
- Detect purchase completion events on checkout confirmation pages
- Record purchase metadata (merchant, amount, timestamp, recommended card)
- Store records locally for future analytics/insights
- No transactional encryption or server sync for MVP

**Design Choice:** Local recording only for MVP; enables future analytics features without requiring backend integration now.

---

## Technical Architecture At A Glance

### Frontend Stack
- **Framework:** React + Vite
- **Styling:** CSS (modular component styles)
- **Storage:** Chrome Storage API (local only)
- **Build:** Vite bundling into extension distribution

### Backend Support (Optional)
- **Node.js** + **Express.js** for card/merchant data seeding
- **MongoDB** for persistent card and merchant database
- **Auth:** JWT-based routes (prepared for future account system)
- Can run fully offline with pre-seeded JSON card/merchant data

### Extension Components
- **Manifest V3** configuration
- **Background script** for event coordination
- **Content scripts** for page detection and form monitoring
- **Popup UI** for recommendations and card management
- **Static HTML pages** for dashboard and onboarding

### Data Storage
- **Card wallet:** `chrome.storage.local` (JSON array of card objects)
- **Merchant database:** Backend JSON or MongoDB collection
- **Card benefits database:** Backend JSON or MongoDB collection
- **Purchase history:** `chrome.storage.local` (local JSON records)
- **UI state:** `chrome.storage.local` (detector status, preferences)

---

## Success Criteria

The MVP will be considered **successful** if:

1. ✅ **Detection Accuracy:** The extension correctly detects checkout pages on 90%+ of tested e-commerce sites (Shopify, WooCommerce, custom platforms)
2. ✅ **Recommendation Accuracy:** A recommendation is generated within 2 seconds of page detection, with card matching the user's actual spending category
3. ✅ **UI Reliability:** The recommendation popup appears correctly, loads card images, displays reward estimates without errors
4. ✅ **Card Management:** Users can add, edit, and remove card entries without errors; card data persists across browser sessions
5. ✅ **System Performance:** The extension operates without measurable performance degradation (< 2s page load impact, no jank in popup interactions)
6. ✅ **Onboarding Completion:** 80%+ of new users complete onboarding and add at least one card to their wallet
7. ✅ **Test Coverage:** All core features covered by automated tests (unit + E2E) with 75%+ code coverage

---

## Explicitly Out of Scope

### Authentication & Accounts
- ❌ User accounts or login systems
- ❌ User profiles with personal data
- ❌ Email verification or password reset flows
- ❌ Account synchronization across devices
- ❌ Cloud backup of card data

### Data Security & Privacy
- ❌ Encryption of stored card data (cards stored as plain JSON)
- ❌ Sensitive data handling (no PCI compliance for MVP)
- ❌ Vault or secure storage implementations
- ❌ Two-factor authentication

### Analytics & Intelligence
- ❌ Machine learning recommendation engine
- ❌ Savings dashboard or spending analytics
- ❌ Monthly spending reports or PDF exports
- ❌ Behavioral recommendations based on purchase history
- ❌ Sign-up bonus tracking and recommendations

### Card Discovery & Expansion
- ❌ New card marketplace or discovery feature
- ❌ Card comparison tools
- ❌ Third-party card APIs or real-time card data
- ❌ Card recommendations for sign-up bonuses
- ❌ Travel perks or business category analysis

### Notifications & Alerts
- ❌ Push notifications
- ❌ Email notifications
- ❌ In-app alert system for high-priority events
- ❌ Browser notification API usage

### Business & Personal Categorization
- ❌ Business vs personal card filtering
- ❌ Business expense tracking
- ❌ Team or family account sharing

### Real-Time Features
- ❌ Real-time credit limit tracking
- ❌ Live card activation status monitoring
- ❌ Real-time balance updates

### Multi-Platform Support
- ❌ Firefox extension (Chrome only for MVP)
- ❌ Safari extension
- ❌ Mobile apps or mobile web responsive design
- ❌ Desktop application

---

## User Workflows

### Workflow 1: First-Time User Setup
1. User installs OnPoint extension
2. Extension icon shows onboarding flow
3. User adds 2-3 credit cards manually
4. Onboarding confirms card library is ready
5. User navigates to e-commerce site

### Workflow 2: Checkout with Recommendation
1. User lands on checkout page while shopping
2. Extension detects checkout and displays detector UI
3. Extension recommends top card with reward estimate
4. User clicks "Use This Card" or skips
5. User completes purchase with their card
6. Extension records purchase metadata locally

### Workflow 3: Card Library Management
1. User clicks extension icon to open dashboard
2. Navigates to Card Library tab
3. Views all cards, adds new card, or deletes card
4. Changes take effect immediately for next checkout detection

---

## MVP Timeline & Milestones

| Milestone | Target Date | Deliverables |
|-----------|-------------|--------------|
| **Blue** | Week 1-2 | Checkout detection working; basic recommendation logic; card CRUD |
| **Green** | Week 3-4 | Full UI integration; onboarding flow; E2E testing setup |
| **Red** | Week 5-6 | Bug fixes; performance optimization; documentation |
| **Launch** | Week 7 | Final testing; release candidate candidate; UAT sign-off |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Checkout detection false positives | Regex pattern refinement + user feedback loop; optional manual override button |
| Recommendation inaccuracy | Rule-based system with configurable benefit thresholds; user can manually select card |
| Performance degradation | Content script optimization; lazy loading of card images; memory profiling |
| Data loss on browser clear | User education + simple backup/restore via export function (future) |
| Cross-site card display inconsistency | Testing matrix across top 10 e-commerce platforms; responsive CSS |

---

## Dependencies & Assumptions

### External Dependencies
- **Chrome/Chromium browser** – Extension requires Chrome 90+
- **MongoDB** – Optional; CSV seeding available as alternative
- **Node.js 16+** – For backend server (optional for offline MVP)
- **Playwright** – For E2E test automation

### Assumptions
- Users have basic tech literacy to install an extension
- Card data is not encrypted; MVP assumes no sensitive data liability
- Recommendation accuracy depends on accurate merchant ID mapping
- Most e-commerce sites follow common checkout patterns
- Users are willing to manually enter cards into the wallet (no automatic bank connection)

---

## Definition of Done

- ✅ Code complete and reviewed in PR
- ✅ Unit tests written and passing (75%+ coverage)
- ✅ Integration tests for recommendation flow passing
- ✅ E2E test added to Playwright suite
- ✅ Documentation updated (inline comments, README)
- ✅ No console errors on target sites
- ✅ Accessibility checklist reviewed (basic WCAG compliance)
- ✅ Merged to `dev` and tested on develop branch

---

## Acceptance Criteria by Feature

### Checkout Detection
- [ ] Extension correctly identifies payment form fields on `checkout-sample.html`
- [ ] Detector UI appears within 2 seconds of page load
- [ ] No false positives on non-checkout pages (`non-checkout.html`)
- [ ] Works on both Shopify and WooCommerce test pages

### Card Recommendation
- [ ] Recommendation returned within 2 seconds of detection
- [ ] Card matching logic correctly selects highest reward card for merchant
- [ ] Reward estimate calculation is accurate per card rules
- [ ] Multiple recommendations displayed if 2+ cards tie in reward value

### Card Management
- [ ] User can add card with valid form validation
- [ ] User can delete card; deletion is persisted
- [ ] User can edit card nickname and primary status
- [ ] Card library shows all added cards without duplicates
- [ ] No crashes on rapid add/remove operations

### Onboarding
- [ ] Onboarding completes with at least 1 card in wallet
- [ ] User sees card library confirmation before exiting onboarding
- [ ] Skip button always available to bypass onboarding
- [ ] Redux/state properly initialized after onboarding completion

### Purchase Tracking
- [ ] Purchase detected on `purchase-completion-sample.html`
- [ ] Purchase records stored in `chrome.storage.local`
- [ ] Record includes merchant ID, amount, timestamp, recommended card
- [ ] No crashes if purchase detection fires multiple times

---

## Testing Strategy

### Unit Tests
- Card recommendation logic (`cardService.js`)
- Wallet management (add/edit/delete)
- Recommendation engine scoring
- Detection regex patterns

### Integration Tests
- Recommendation API response handling
- Card library list rendering with mock data
- Onboarding completion → detector activation flow

### E2E Tests (Playwright)
- Load extension unpacked and navigate to checkout test page
- Assert detector UI presence and recommendation display
- Verify card management in dashboard
- Purchase completion detection and recording

### Manual QA Checklist
- [ ] Test on real Shopify storefront
- [ ] Test on real WooCommerce site
- [ ] Test on Amazon product page → checkout flow
- [ ] Test card add/remove during active checkout
- [ ] Verify no console errors on any test site

---

## Documentation Deliverables

- [x] MVP Scope Document (this file)
- [x] Technical Architecture Overview
- [x] API Specification (routes and payloads)
- [ ] User Guide (onboarding, card management)
- [ ] Developer Setup Guide (dev environment, running tests)
- [ ] Test Scenarios & Execution Plan
- [ ] Deployment & Release Notes

---

## Success Metrics (Post-Launch)

- Extension installs: 100+ in first month
- Daily active users: 30%+ of installs
- Average cards per user: 2.5+
- Recommendation acceptance rate: 60%+
- User retention (week 1): 70%+
- No major bugs reported in first week

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |

---

## Appendix: Feature Comparison

| Feature | MVP | Backlog |
|---------|-----|---------|
| Checkout detection | ✅ | |
| Rule-based recommendations | ✅ | |
| Card management (CRUD) | ✅ | |
| Local card storage | ✅ | |
| Recommendation popup | ✅ | |
| Onboarding flow | ✅ | |
| Purchase tracking (local) | ✅ | |
| User accounts | | ✅ |
| Cloud card sync | | ✅ |
| ML recommendations | | ✅ |
| Spending analytics dashboard | | ✅ |
| Monthly reports/exports | | ✅ |
| Savings tracking | | ✅ |
| Sign-up bonus tracking | | ✅ |
| Multi-browser support | | ✅ |

---

**End of MVP Scope Document**
