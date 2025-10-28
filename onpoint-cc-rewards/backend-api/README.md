# OnPoint Backend API

This folder contains the Node.js/Express backend for OnPoint.
It is responsible for user authentication, card storage, and the recommendation engine

## MVP Goals
- Create signup / login endpoints with auth
- Store cards in MongoDB
- Provide a simple recommendation endpoint:
    - Input: spending category
    - Output: best credit card + reward estimate

## Key Files (Planned)
- `server.js` - Entry point + Express configuration
- `routes/` - API endpoints
- `controllers/` - Business logic for each feature
- `models/` - MongoDB schemas (User, Card)
- `utils/` - Recommendation logic

