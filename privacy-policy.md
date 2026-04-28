# Privacy Policy for OnPoint

**Last updated: April 28, 2026**

## Overview

OnPoint is a Chrome extension that helps you maximize credit card rewards by recommending the best card for each purchase. This policy explains what data we collect, how we use it, and how it is protected.

---

## What Data We Collect

### Data Stored Locally (on your device)
- **Cards in your wallet** — the credit cards you add to OnPoint, including their reward attributes
- **Purchase history** — merchant names, tags (e.g. "groceries", "travel"), and checkout URLs detected during browsing

This data is stored in `chrome.storage.local` and never leaves your device unless explicitly sent to our backend (see below).

### Data Sent to Our Backend
When a checkout page is detected, OnPoint sends:
- The **hostname** of the merchant (e.g. `walmart.com`) — never the full URL or any personal details
- The **IDs of cards in your wallet** — used to score and rank your cards for that merchant

We do **not** collect or transmit:
- Your name, email, or any personally identifiable information
- Browsing history outside of checkout pages
- Credit card numbers, CVVs, or financial account details
- Purchase amounts

---

## How We Use Your Data

Data is used solely to:
- Recommend the best credit card for a given purchase
- Show you personalized card suggestions based on your spending categories
- Improve the accuracy of merchant tag matching

We do **not** sell, rent, or share your data with any third parties.

---

## Data Retention

- Local data (wallet cards, purchase history) remains on your device until you uninstall the extension or clear it manually.
- Our backend does not store purchase events or card data beyond what is needed to fulfill a single recommendation request.

---

## Permissions Used

| Permission | Reason |
|---|---|
| `activeTab` | Detect whether the current page is a checkout page |
| `storage` | Save your wallet and settings locally on your device |
| `scripting` | Inject the checkout detector script on merchant pages |

We do not request permissions beyond what is necessary to provide recommendations.

---

## Third-Party Services

OnPoint's backend is hosted on [Render](https://render.com). Requests to the backend are made over HTTPS. Please refer to [Render's Privacy Policy](https://render.com/privacy) for information on their data handling practices.

---

## Children's Privacy

OnPoint is not directed at children under the age of 13. We do not knowingly collect data from children.

---

## Changes to This Policy

We may update this policy as the extension evolves. The "Last updated" date at the top of this page will reflect any changes. Continued use of the extension after changes constitutes acceptance of the updated policy.

---

## Contact

If you have any questions about this privacy policy, please open an issue on our [GitHub repository](https://github.com/) or contact the development team directly.
