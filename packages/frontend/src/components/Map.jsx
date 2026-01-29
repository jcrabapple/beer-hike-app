import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStore } from '../store';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const { trails, breweries, userLocation, mapCenter, selectedTrail, selectedBrewery } = useStore();

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: userLocation ? [userLocation.lon, userLocation.lat] : [-95.7129, 37.0902],
      zoom: 12,
    });

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (mapCenter && map.current) {
      map.current.flyTo({
        center: [mapCenter.lon, mapCenter.lat],
        zoom: 12,
        duration: 1000,
      });
    }
  }, [mapCenter]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach((el) => el.remove());

    // Add trail markers
    trails.forEach((trail) => {
      const location = JSON.parse(trail.location);
      const marker = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([location.coordinates[0], location.coordinates[1]])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${trail.name}</h3><p>${trail.difficulty}</p>`))
        .addTo(map.current);
    });

    // Add brewery markers
    breweries.forEach((brewery) => {
      const location = JSON.parse(brewery.location);
      const marker = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat([location.coordinates[0], location.coordinates[1]])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${brewery.name}</h3><p>${brewery.type}</p>`))
        .addTo(map.current);
    });
  }, [trails, breweries]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
