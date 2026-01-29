import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { initDb, pool } from './db.js';
import { authMiddleware, getOrCreateUser } from './auth.js';
import { startScheduler } from './scheduler.js';
import { syncAllData } from './sync.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Initialize database
await initDb();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Sync endpoint (admin only)
app.post('/api/admin/sync', async (req, res) => {
  try {
    await syncAllData();
    res.json({ message: 'Sync started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trails endpoints
app.get('/api/trails/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 10 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon required' });
    }

    const query = `
      SELECT 
        MIN(id) as id,
        name, 
        difficulty, 
        length_miles,
        elevation_gain,
        ST_AsGeoJSON(ST_Centroid(ST_Collect(location::geometry))) as location,
        COUNT(*) as entry_count
      FROM trails
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3 * 1609.34)
      GROUP BY name, difficulty, length_miles, elevation_gain
      ORDER BY ST_Distance(ST_Centroid(ST_Collect(location::geometry)), ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 50
    `;

    const result = await pool.query(query, [lon, lat, radius]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all entry points for a trail
app.get('/api/trails/entries/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { lat, lon, radius = 10 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon required' });
    }

    const query = `
      SELECT id, name, difficulty, length_miles, elevation_gain, ST_AsGeoJSON(location) as location
      FROM trails
      WHERE name = $1
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4 * 1609.34)
      ORDER BY ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $3), 4326))
    `;

    const result = await pool.query(query, [name, lon, lat, radius]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Breweries endpoints
app.get('/api/breweries/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 10 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon required' });
    }

    const query = `
      SELECT id, name, type, ST_AsGeoJSON(location) as location
      FROM breweries
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3 * 1609.34)
      ORDER BY ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 50
    `;

    const result = await pool.query(query, [lon, lat, radius]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchTerm = `${q}%`;
    const results = [];

    // Search trails - match at start of name
    const trailsResult = await pool.query(
      `SELECT id, name, 'trail' as type, ST_AsGeoJSON(location) as location
       FROM trails
       WHERE name ILIKE $1
       LIMIT 10`,
      [searchTerm]
    );

    // Search breweries - match at start of name
    const breweriesResult = await pool.query(
      `SELECT id, name, 'brewery' as type, ST_AsGeoJSON(location) as location
       FROM breweries
       WHERE name ILIKE $1
       LIMIT 10`,
      [searchTerm]
    );

    results.push(...trailsResult.rows, ...breweriesResult.rows);
    res.json(results.slice(0, 20));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Geocode endpoint for city/town search using Mapbox
app.get('/api/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const mapboxToken = process.env.MAPBOX_TOKEN;
    if (!mapboxToken) {
      return res.json([]);
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
        {
          params: {
            access_token: mapboxToken,
            country: 'us',
            limit: 5,
          },
          timeout: 5000,
        }
      );

      const results = response.data.features.map(feature => ({
        name: feature.place_name,
        lat: feature.center[1],
        lon: feature.center[0],
        type: 'location',
      }));

      res.json(results);
    } catch (error) {
      res.json([]);
    }
  } catch (error) {
    res.json([]);
  }
});

// Pairings endpoints
app.get('/api/pairings/suggest', async (req, res) => {
  try {
    const { trail_id, radius = 5 } = req.query;
    
    if (!trail_id) {
      return res.status(400).json({ error: 'trail_id required' });
    }

    const query = `
      SELECT b.id, b.name, b.type, ST_AsGeoJSON(b.location) as location,
             ST_Distance(b.location, t.location) / 1609.34 as distance_miles
      FROM breweries b, trails t
      WHERE t.id = $1
      AND ST_DWithin(b.location, t.location, $2 * 1609.34)
      ORDER BY distance_miles
      LIMIT 20
    `;

    const result = await pool.query(query, [trail_id, radius]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save pairing endpoint
app.post('/api/pairings/save', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { trail_id, brewery_id } = req.body;
    const user = await getOrCreateUser(req.user.sub, req.user.email);

    if (!user) {
      return res.status(500).json({ error: 'User creation failed' });
    }

    const result = await pool.query(
      `INSERT INTO saved_pairings (user_id, trail_id, brewery_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [user.id, trail_id, brewery_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get saved pairings
app.get('/api/pairings/saved', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getOrCreateUser(req.user.sub, req.user.email);

    const result = await pool.query(
      `SELECT sp.id, t.id as trail_id, t.name as trail_name, 
              b.id as brewery_id, b.name as brewery_name
       FROM saved_pairings sp
       JOIN trails t ON sp.trail_id = t.id
       JOIN breweries b ON sp.brewery_id = b.id
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start scheduler
startScheduler();

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
