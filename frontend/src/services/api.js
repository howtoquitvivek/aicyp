const API_BASE = 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const { headers, ...restOptions } = options;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...restOptions,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Network error' }));
    let errorMsg = error.detail || `Request failed (${res.status})`;
    if (Array.isArray(error.detail)) {
      errorMsg = error.detail.map(e => e.msg).join(', ');
    } else if (typeof error.detail === 'object') {
      errorMsg = JSON.stringify(error.detail);
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

const api = {
  datasets: {
    getCrops: () => request('/api/datasets/crops'),
    getCommodities: () => request('/api/datasets/commodities'),
    addCrop: (crop) =>
      request('/api/datasets/crops', {
        method: 'POST',
        body: JSON.stringify(crop),
      }),
    addCommodity: (commodity) =>
      request('/api/datasets/commodities', {
        method: 'POST',
        body: JSON.stringify(commodity),
      }),
  },

  ai: {
    getPlotInsights: (plotData) =>
      request('/api/ai/plot-insights', {
        method: 'POST',
        body: JSON.stringify(plotData),
      }),
  },

  weather: {
    getCurrent: (city) => request(`/api/weather/current?city=${encodeURIComponent(city)}`),
    getForecast: (city) => request(`/api/weather/forecast?city=${encodeURIComponent(city)}`),
    getAirQuality: (city) => request(`/api/weather/air-quality?city=${encodeURIComponent(city)}`),
    getFull: (city) => request(`/api/weather/full?city=${encodeURIComponent(city)}`),
  },

  crops: {
    recommend: (data) =>
      request('/api/crops/recommend', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  market: {
    getPrices: (category) => {
      const params = category ? `?category=${encodeURIComponent(category)}` : '';
      return request(`/api/market/prices${params}`);
    },
    getDetail: (id) => request(`/api/market/prices/${encodeURIComponent(id)}`),
    getCurrent: (crop, district, state) => {
      const params = new URLSearchParams();
      if (crop) params.append('crop', crop);
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      return request(`/api/market/current?${params.toString()}`);
    },
    search: (crop, state, district) => {
      const params = new URLSearchParams();
      if (crop) params.append('crop', crop);
      if (state) params.append('state', state);
      if (district) params.append('district', district);
      return request(`/api/market/search?${params.toString()}`);
    },
  },

  users: {
    getMe: (uid) =>
      request('/api/users/me', { headers: { 'x-uid': uid } }),

    saveProfile: (uid, data) =>
      request('/api/users/me/profile', {
        method: 'PUT',
        headers: { 'x-uid': uid },
        body: JSON.stringify(data),
      }),

    saveFarm: (uid, data) =>
      request('/api/users/me/farm', {
        method: 'PUT',
        headers: { 'x-uid': uid },
        body: JSON.stringify(data),
      }),

    savePreferences: (uid, data) =>
      request('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'x-uid': uid },
        body: JSON.stringify(data),
      }),
      
    saveYieldPlan: (uid, data) =>
      request('/api/users/me/plans', {
        method: 'POST',
        headers: { 'x-uid': uid },
        body: JSON.stringify(data),
      }),

    saveRecommendation: (uid, data) =>
      request('/api/users/me/recommendations', {
        method: 'POST',
        headers: { 'x-uid': uid },
        body: JSON.stringify(data),
      }),

    logFirstView: (uid, plotId, view_type) => request('/api/users/me/timeline/first_view', {
      method: 'POST',
      headers: { 'x-uid': uid },
      body: JSON.stringify({ plotId, view_type }),
    }),
  },
  
  agribot: {
    chat: (uid, question, activePlotId, chatHistory, action = 'chat') =>
      request('/api/agribot/chat', {
        method: 'POST',
        headers: { 'x-user-id': uid },
        body: JSON.stringify({ question, activePlotId, chatHistory, action }),
      }),
  },
};

export default api;
