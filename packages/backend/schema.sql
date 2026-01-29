-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Trails table
CREATE TABLE trails (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  difficulty VARCHAR(50),
  length_miles DECIMAL(10, 2),
  elevation_gain INT,
  external_id VARCHAR(255) UNIQUE,
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Breweries table
CREATE TABLE breweries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  type VARCHAR(100),
  external_id VARCHAR(255) UNIQUE,
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth0_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved pairings table
CREATE TABLE saved_pairings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  trail_id INT REFERENCES trails(id) ON DELETE CASCADE,
  brewery_id INT REFERENCES breweries(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, trail_id, brewery_id)
);

-- Indexes for spatial queries
CREATE INDEX idx_trails_location ON trails USING GIST(location);
CREATE INDEX idx_breweries_location ON breweries USING GIST(location);
CREATE INDEX idx_saved_pairings_user ON saved_pairings(user_id);
