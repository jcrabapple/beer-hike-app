# Beer & Hike App

A cross-platform web app for discovering hiking trails and breweries near you.

## Project Structure

```
beer-hike-app/
├── packages/
│   ├── backend/          # Express API server
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── db.js
│   │   │   ├── auth.js
│   │   │   ├── sync.js
│   │   │   └── scheduler.js
│   │   ├── schema.sql
│   │   ├── package.json
│   │   └── .env.example
│   └── frontend/         # React web app
│       ├── src/
│       │   ├── components/
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── store.js
│       ├── index.html
│       ├── vite.config.js
│       ├── package.json
│       └── .env.example
└── package.json          # Root workspace config
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL with PostGIS extension
- Auth0 account (for authentication)
- Mapbox API token
- Hiking Project API key
- Open Brewery DB (free, no key needed)

### Installation

1. Clone and install dependencies:
```bash
cd beer-hike-app
npm install
```

2. Set up PostgreSQL database:
```bash
createdb beer_hike_app
psql beer_hike_app < packages/backend/schema.sql
```

3. Set up Auth0:
   - Create an Auth0 application
   - Create an API in Auth0
   - Note your domain, client ID, and API identifier

4. Set up environment variables:
```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

5. Fill in your `.env` files:

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/beer_hike_app
PORT=3001
NODE_ENV=development
HIKING_PROJECT_API_KEY=your_key
AUTH0_DOMAIN=your_domain.auth0.com
AUTH0_AUDIENCE=your_api_identifier
```

**Frontend (.env):**
```
VITE_MAPBOX_TOKEN=your_token
VITE_AUTH0_DOMAIN=your_domain.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=your_api_identifier
```

### Development

Run both frontend and backend concurrently:
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Initial Data Load

Sync data from APIs:
```bash
curl -X POST http://localhost:3001/api/admin/sync
```

Or the sync runs automatically every day at 2 AM.

### Build

```bash
npm run build
```

## Features (MVP)

- Geolocation-based trail and brewery search
- Interactive map with Mapbox
- Trail and brewery filtering
- Pairing suggestions
- User authentication with Auth0
- Save favorite pairings
- Responsive design for mobile and desktop

## API Endpoints

**Public:**
- `GET /api/health` - Health check
- `GET /api/trails/nearby?lat=X&lon=Y&radius=10` - Nearby trails
- `GET /api/breweries/nearby?lat=X&lon=Y&radius=10` - Nearby breweries
- `GET /api/pairings/suggest?trail_id=X&radius=5` - Suggested breweries for trail

**Authenticated:**
- `POST /api/pairings/save` - Save a trail/brewery pairing
- `GET /api/pairings/saved` - Get user's saved pairings

**Admin:**
- `POST /api/admin/sync` - Manually trigger data sync

## Data Sources

- **Trails**: Hiking Project API
- **Breweries**: Open Brewery DB
- **Maps**: Mapbox GL
- **Weather**: OpenWeatherMap (future)
