import axios from 'axios';
import { apiCache } from '../utils/apiCache';
import { API_BASE_URL } from '../config';

export const apiService = {
  async fetchWithCache(endpoint, token, forceRefresh = false) {
    const cacheKey = `${endpoint}_${token}`;
    
    if (!forceRefresh) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) return cachedData;
    }

    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    apiCache.set(cacheKey, response.data);
    return response.data;
  },

  clearCache() {
    apiCache.clear();
  }
}; 