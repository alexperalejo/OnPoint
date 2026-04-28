# OnPoint — Credit Card Rewards Optimizer

> Maximize your credit card rewards automatically at checkout.

OnPoint is a Chrome extension that detects when you're on a checkout page, recommends the best credit card from your wallet based on merchant category and reward rates, and tracks your savings over time.

---

##  Installation (Developer Mode)

Since OnPoint is not published to the Chrome Web Store, install it manually:

### Prerequisites
- Google Chrome browser
- Node.js (v18+)
- MongoDB (local or Atlas)

### Step 1 — Clone the Repository
```bash
git clone https://github.com/your-team/onpoint.git
cd onpoint
```

### Step 2 — Set Up the Backend
```bash
cd onpoint-cc-rewards/backend-api
cp .env.example .env
```

Edit `.env` and add your MongoDB connection string:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

Install dependencies and seed the database:
```bash
npm install
node database/seedCards.js
node database/seedMerchants.js
node server.js
```

The backend will run on `http://localhost:3000`.

### Step 3 — Build the Frontend
```bash
cd ../frontend
npm install
npm run build
```

This outputs the built files to `../../extension/dist/`.

### Step 4 — Load the Extension in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top right)
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. OnPoint is now installed! 

---

##  How to Use

1. **Add your cards** — Click the OnPoint icon → Settings → Card Library → Add cards to your wallet
2. **Shop online** — Visit any supported merchant (Amazon, Ralphs, Hilton, DoorDash, Expedia)
3. **Get recommended** — OnPoint auto-detects checkout and recommends the best card
4. **Verify purchase** — After checkout, confirm which card you used
5. **Track savings** — View your accumulated rewards in the Savings Analysis tab

---

##  Supported Merchants

| Merchant | Category | Best Card Example |
|----------|----------|-------------------|
| Ralphs | Groceries | Amex Blue Cash Preferred (6x) |
| Amazon | Shopping | Capital One Venture X (2x) |
| DoorDash | Dining | Amex Gold (4x) |
| Hilton | Travel/Hotel | Chase Sapphire Preferred (5x) |
| Expedia | Travel/Flights | Capital One Venture X (5x) |

---

##  Supported Cards

| Card | Type | Top Reward |
|------|------|-----------|
| Chase Freedom Unlimited | Cashback | 3% Dining, 1.5% All |
| Chase Sapphire Preferred | Points | 3x Dining, 5x Chase Travel |
| American Express Gold | Points | 4x Dining, 4x Groceries |
| Citi Double Cash | Cashback | 2% All Purchases |
| Capital One SavorOne | Cashback | 3% Dining, 3% Groceries |
| Discover it Cash Back | Cashback | 5% Rotating, 1% All |
| Capital One Venture X | Points | 10x Hotels/Cars, 5x Flights |
| Amex Blue Cash Preferred | Cashback | 6% Groceries, 6% Streaming |
| Chase Freedom Flex | Cashback | 5% Rotating, 3% Dining |

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Extension | Chrome MV3, JavaScript |
| Tools | Git, Jira, MongoDB Compass |

---

##  Project Structure

```
OnPoint/
├── extension/                  # Chrome extension source
│   ├── manifest.json
│   ├── background.js
│   ├── content/                # Content scripts
│   │   ├── detect-core.js
│   │   ├── detect.js
│   │   ├── purchase-detect-core.js
│   │   └── purchase.js
│   ├── icons/
│   └── dist/                   # Built frontend (generated)
│
└── onpoint-cc-rewards/
    ├── frontend/               # React app (Vite)
    │   ├── src/
    │   │   ├── components/
    │   │   │   ├── CardRecommendation/
    │   │   │   ├── CheckoutDetector/
    │   │   │   └── PurchaseVerification/
    │   │   └── pages/
    │   │       ├── Dashboard.jsx
    │   │       ├── CardLibrary.jsx
    │   │       └── UserProfile.jsx
    │   └── public/
    │
    └── backend-api/            # Express API
        ├── models/
        │   ├── Card.js
        │   └── Merchant.js
        ├── routes/
        │   ├── cardRoutes.js
        │   └── recommendationRoutes.js
        ├── services/
        │   ├── cardService.js
        │   └── recommendationService.js
        ├── database/
        │   ├── cards.json
        │   ├── merchants.json
        │   ├── seedCards.js
        │   └── seedMerchants.js
        └── server.js
```

---

##  Development

### Rebuild after frontend changes
```bash
cd onpoint-cc-rewards/frontend
npm run build
```
Then reload the extension at `chrome://extensions`.

### Reseed database
```bash
cd onpoint-cc-rewards/backend-api
node database/seedCards.js
node database/seedMerchants.js
```

### Restart backend
```bash
cd onpoint-cc-rewards/backend-api
node server.js
```

---

##  Notes

- The backend must be running on `localhost:3000` for the extension to work
- Card IDs are fixed in `cards.json` — reseeding will not break your saved wallet
- Savings data is stored in `chrome.storage.local` and persists across reloads
- Only clearing Chrome data or removing the extension will wipe saved data

---

##  Team

- [Artur Aleksanian](https://github.com/artur-a1)
- [Chris Gharibian](https://github.com/ChGharibian)
- [Justyn Canfield](https://github.com/CyrusVix)
- [Maria Alexandra Lois Peralejo](https://github.com/alexperalejo)

---

##  User Research

Based on 12 user interviews (April 2026):
- **75%** said a browser extension would be helpful
- **83%** want the popup only when a better option is found
- **67%** felt they left money on the table with purchases

---

*COMP 490 Senior Project · California State University, Northridge · Spring 2026*


## License

[MIT](LICENSE)




