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
- Mapbox API token

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

3. Set up environment variables:
```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

4. Fill in your `.env` files:

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/beer_hike_app
PORT=3001
NODE_ENV=development
MAPBOX_TOKEN=your_mapbox_token
```

**Frontend (.env):**
```
VITE_MAPBOX_TOKEN=your_mapbox_token
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

## Features

- Geolocation-based trail and brewery search
- Interactive map with Mapbox
- Search trails, breweries, and cities nationwide
- Consolidated trail display with multiple entry points
- Responsive design for mobile and desktop
- 27,000+ NPS trails
- 10,000+ breweries from Open Brewery DB

## API Endpoints

**Public:**
- `GET /api/health` - Health check
- `GET /api/trails/nearby?lat=X&lon=Y&radius=10` - Nearby trails (consolidated by name)
- `GET /api/trails/entries/:name?lat=X&lon=Y&radius=10` - All entry points for a trail
- `GET /api/breweries/nearby?lat=X&lon=Y&radius=10` - Nearby breweries
- `GET /api/search?q=query` - Search trails and breweries
- `GET /api/geocode?q=query` - Search cities/locations

**Admin:**
- `POST /api/admin/sync` - Manually trigger data sync

## Data Sources

- **Trails**: National Park Service (27,000+ trails)
- **Breweries**: Open Brewery DB (10,000+ breweries)
- **Maps**: Mapbox GL
- **Geocoding**: Mapbox Geocoding API
