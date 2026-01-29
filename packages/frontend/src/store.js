import create from 'zustand';
import axios from 'axios';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
});

export const useStore = create((set, get) => ({
  trails: [],
  breweries: [],
  selectedTrail: null,
  selectedBrewery: null,
  userLocation: null,
  mapCenter: null,
  loading: false,
  error: null,
  savedPairings: [],
  token: null,

  setToken: (token) => {
    set({ token });
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },

  setUserLocation: (location) => set({ userLocation: location }),
  
  setMapCenter: (lat, lon) => set({ mapCenter: { lat, lon } }),

  fetchNearbyTrails: async (lat, lon, radius = 10) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/trails/nearby', {
        params: { lat, lon, radius },
      });
      set({ trails: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchNearbyBreweries: async (lat, lon, radius = 10) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/breweries/nearby', {
        params: { lat, lon, radius },
      });
      set({ breweries: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSuggestedBreweries: async (trailId, radius = 5) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/pairings/suggest', {
        params: { trail_id: trailId, radius },
      });
      set({ breweries: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  savePairing: async (trailId, breweryId) => {
    try {
      const response = await apiClient.post('/pairings/save', {
        trail_id: trailId,
        brewery_id: breweryId,
      });
      get().fetchSavedPairings();
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchSavedPairings: async () => {
    try {
      const response = await apiClient.get('/pairings/saved');
      set({ savedPairings: response.data });
    } catch (error) {
      console.error('Error fetching saved pairings:', error);
    }
  },

  selectTrail: (trail) => set({ selectedTrail: trail }),
  selectBrewery: (brewery) => set({ selectedBrewery: brewery }),
}));
