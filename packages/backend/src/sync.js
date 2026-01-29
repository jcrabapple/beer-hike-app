import axios from 'axios';
import { pool } from './db.js';

const OPEN_BREWERY_API = 'https://api.openbrewerydb.org/v1/breweries';
const NPS_TRAILS_API = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/National_Park_Service_Trails/FeatureServer/0/query';

export async function syncNPSTrails() {
  try {
    console.log('Syncing NPS trails...');
    
    let resultOffset = 0;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      try {
        const response = await axios.get(NPS_TRAILS_API, {
          params: {
            where: '1=1',
            outFields: '*',
            f: 'geojson',
            resultRecordCount: 1000,
            resultOffset: resultOffset,
          },
          timeout: 30000,
        });

        if (!response.data.features || response.data.features.length === 0) {
          hasMore = false;
          break;
        }

        for (const feature of response.data.features) {
          const props = feature.properties;
          const geom = feature.geometry;
          
          if (!geom || !props?.TRLNAME) continue;

          let lon, lat;
          if (geom.type === 'LineString' && geom.coordinates[0]) {
            [lon, lat] = geom.coordinates[0];
          } else if (geom.type === 'Point') {
            [lon, lat] = [geom.coordinates[0], geom.coordinates[1]];
          } else {
            continue;
          }

          await pool.query(
            `INSERT INTO trails (name, location, difficulty, length_miles, external_id, source)
             VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)
             ON CONFLICT (external_id) DO UPDATE SET updated_at = NOW()`,
            [
              props.TRLNAME,
              lon,
              lat,
              props.TRLCLASS?.includes('Easy') ? 'easy' : props.TRLCLASS?.includes('Difficult') ? 'hard' : 'moderate',
              null,
              `nps_${props.OBJECTID}`,
              'nps_trails',
            ]
          );
          totalCount++;
        }

        resultOffset += response.data.features.length;
        console.log(`Synced ${totalCount} NPS trails so far...`);
      } catch (error) {
        console.error(`Error syncing NPS trails at offset ${resultOffset}:`, error.message);
        hasMore = false;
      }
    }
    console.log(`Synced ${totalCount} total NPS trails`);
  } catch (error) {
    console.error('NPS trails sync failed:', error.message);
  }
}

export async function syncOpenBreweries() {
  try {
    console.log('Syncing Open Brewery DB...');
    
    let page = 1;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore && page <= 50) {
      try {
        const response = await axios.get(OPEN_BREWERY_API, {
          params: {
            per_page: 200,
            page,
          },
        });

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const brewery of response.data) {
          if (!brewery.latitude || !brewery.longitude) continue;

          await pool.query(
            `INSERT INTO breweries (name, location, type, external_id, source)
             VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)
             ON CONFLICT (external_id) DO UPDATE SET updated_at = NOW()`,
            [
              brewery.name,
              brewery.longitude,
              brewery.latitude,
              brewery.brewery_type || 'unknown',
              brewery.id,
              'open_brewery_db',
            ]
          );
          totalCount++;
        }
        console.log(`Synced page ${page} (${response.data.length} breweries)`);
        page++;
      } catch (error) {
        console.error(`Error syncing page ${page}:`, error.message);
        hasMore = false;
      }
    }
    console.log(`Synced ${totalCount} total breweries`);
  } catch (error) {
    console.error('Open Brewery DB sync failed:', error.message);
  }
}

export async function syncAllData() {
  await syncNPSTrails();
  await syncOpenBreweries();
  console.log('Data sync complete');
}
