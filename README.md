# OnPoint

> Real-time credit card recommendations that help you maximize cashback, points, and financial benefits at every purchase.

OnPoint is a Chrome extension powered by a Node.js backend and MongoDB data platform. It analyzes your credit cards and the merchant you're shopping at, then instantly surfaces the best card to use — so you never leave rewards on the table.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- Google Chrome

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/onpoint.git
cd onpoint
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/onpoint
```

Start the server:

```bash
npm start
```

### 3. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository

The OnPoint icon will appear in your Chrome toolbar.

---

## Usage

1. **Add your credit cards** — Open the OnPoint popup and enter the cards in your wallet along with their reward categories.
2. **Shop anywhere online** — OnPoint detects the merchant you're visiting in real time.
3. **Get a recommendation** — The extension instantly highlights the best card to use for maximum rewards at that merchant.
4. **Check your rewards** — View a summary of estimated cashback and points earned over time from the popup dashboard.

---

## Project Structure

```
onpoint/
├── backend/          # Node.js API server
│   ├── routes/       # API endpoints
│   ├── models/       # MongoDB schemas
│   └── server.js     # Entry point
├── extension/        # Chrome extension
│   ├── popup/        # Popup UI
│   ├── content.js    # Page-level script
│   └── manifest.json
└── README.md
```

---

## Contributing

Pull requests are welcome! Please open an issue first to discuss any major changes.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

# Collaborators

- [Artur Aleksanian](https://github.com/artur-a1)
- [Chris Gharibian](https://github.com/ChGharibian)
- [Justyn Canfield](https://github.com/CyrusVix)
- [Maria Alexandra Lois Peralejo](https://github.com/alexperalejo)

## License

[MIT](LICENSE)




