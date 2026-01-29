import { useEffect, useState } from 'react';
import { useStore } from '../store';

export function SearchPanel() {
  const { trails, breweries, loading, error, fetchNearbyTrails, fetchNearbyBreweries, setUserLocation, setMapCenter, userLocation } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('all');
  const [selectedTrailDetails, setSelectedTrailDetails] = useState(null);
  const [trailEntries, setTrailEntries] = useState([]);

  useEffect(() => {
    const fetchData = (lat, lon) => {
      setUserLocation({ lat, lon });
      fetchNearbyTrails(lat, lon, 25);
      fetchNearbyBreweries(lat, lon, 25);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchData(latitude, longitude);
        },
        (error) => {
          // Fallback to Denver for testing
          fetchData(39.7392, -104.9903);
        }
      );
    } else {
      // Fallback to Denver for testing
      fetchData(39.7392, -104.9903);
    }
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const apiBase = import.meta.env.VITE_API_BASE || '/api';

    try {
      let formatted = [];

      if (searchType === 'all' || searchType === 'trails') {
        const trailsRes = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}`);
        const trails = await trailsRes.json();
        formatted.push(...trails.filter(r => r.type === 'trail').map(result => ({
          type: result.type,
          name: result.name,
          lat: JSON.parse(result.location).coordinates[1],
          lon: JSON.parse(result.location).coordinates[0],
        })));
      }

      if (searchType === 'all' || searchType === 'breweries') {
        const breweriesRes = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}`);
        const breweries = await breweriesRes.json();
        formatted.push(...breweries.filter(r => r.type === 'brewery').map(result => ({
          type: result.type,
          name: result.name,
          lat: JSON.parse(result.location).coordinates[1],
          lon: JSON.parse(result.location).coordinates[0],
        })));
      }

      if (searchType === 'all' || searchType === 'cities') {
        const geocodeRes = await fetch(`${apiBase}/geocode?q=${encodeURIComponent(query)}`);
        if (geocodeRes.ok) {
          const locations = await geocodeRes.json();
          formatted.push(...(Array.isArray(locations) ? locations.map(result => ({
            type: 'location',
            name: result.name,
            lat: result.lat,
            lon: result.lon,
          })) : []));
        }
      }

      setSearchResults(formatted.slice(0, 15));
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSearchResultClick = (result) => {
    setSearchQuery('');
    setSearchResults([]);
    setUserLocation({ lat: result.lat, lon: result.lon });
    setMapCenter(result.lat, result.lon);
    fetchNearbyTrails(result.lat, result.lon, 25);
    fetchNearbyBreweries(result.lat, result.lon, 25);
  };

  const handleTrailClick = async (trail) => {
    setSelectedTrailDetails(trail);
    if (userLocation && trail.entry_count > 1) {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || '/api';
        const response = await fetch(
          `${apiBase}/trails/entries/${encodeURIComponent(trail.name)}?lat=${userLocation.lat}&lon=${userLocation.lon}&radius=25`
        );
        const entries = await response.json();
        setTrailEntries(entries);
      } catch (error) {
        console.error('Error fetching trail entries:', error);
      }
    }
  };

  const handleRefresh = () => {
    if (userLocation) {
      fetchNearbyTrails(userLocation.lat, userLocation.lon, 25);
      fetchNearbyBreweries(userLocation.lat, userLocation.lon, 25);
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full md:w-96 h-screen md:h-auto bg-white shadow-lg overflow-y-auto z-10">
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Beer & Hike</h1>
          <button onClick={handleRefresh} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
            Refresh
          </button>
        </div>

        <div className="mb-4 relative">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <select 
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                handleSearch(searchQuery);
              }}
              className="p-2 border rounded"
            >
              <option value="all">All</option>
              <option value="trails">Trails</option>
              <option value="breweries">Breweries</option>
              <option value="cities">Cities</option>
            </select>
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded shadow-lg z-20 mt-1">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSearchResultClick(result)}
                  className="p-3 border-b hover:bg-gray-100 cursor-pointer"
                >
                  <div className="font-medium">{result.name}</div>
                  <div className="text-xs text-gray-500">
                    {result.type === 'trail' && '🥾 Trail'}
                    {result.type === 'brewery' && '🍺 Brewery'}
                    {result.type === 'location' && '📍 Location'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        {loading && <div className="text-center py-4">Loading...</div>}

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Nearby Trails</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {trails.map((trail) => {
                const location = JSON.parse(trail.location);
                return (
                  <div 
                    key={trail.id} 
                    className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      handleTrailClick(trail);
                      setMapCenter(location.coordinates[1], location.coordinates[0]);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{trail.name}</h3>
                        <p className="text-sm text-gray-600">{trail.difficulty} • {trail.length_miles} mi</p>
                      </div>
                      {trail.entry_count > 1 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {trail.entry_count} entries
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Nearby Breweries</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {breweries.map((brewery) => {
                const location = JSON.parse(brewery.location);
                return (
                  <div 
                    key={brewery.id} 
                    className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => setMapCenter(location.coordinates[1], location.coordinates[0])}
                  >
                    <h3 className="font-medium">{brewery.name}</h3>
                    <p className="text-sm text-gray-600">{brewery.type}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedTrailDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-end">
            <div className="bg-white w-full md:w-96 rounded-t-lg p-4 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedTrailDetails.name}</h3>
                <button 
                  onClick={() => {
                    setSelectedTrailDetails(null);
                    setTrailEntries([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {selectedTrailDetails.difficulty} • {selectedTrailDetails.length_miles} mi
              </p>

              {trailEntries.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Entry Points ({trailEntries.length})</h4>
                  <div className="space-y-2">
                    {trailEntries.map((entry, idx) => {
                      const location = JSON.parse(entry.location);
                      return (
                        <div 
                          key={idx}
                          onClick={() => setMapCenter(location.coordinates[1], location.coordinates[0])}
                          className="p-2 border rounded hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          Entry Point {idx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
