/**
 * Centralized API Client & Endpoint Resolver for Natural Milk Dairy
 * Uses import.meta.env.VITE_API_URL for production backend (Render)
 */

const envApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = envApiUrl.replace(/\/+$/, '');

/**
 * Resolves an endpoint to a full URL using VITE_API_URL in production,
 * or relative URL in development (handled by Vite proxy).
 *
 * @param {string} endpoint - e.g. '/api/auth/login'
 * @returns {string} - e.g. 'https://naturalmilkdiary.onrender.com/api/auth/login'
 */
export function getApiUrl(endpoint = '') {
  if (!endpoint) return API_BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Resolves WebSocket URL pointing to Render backend in production
 */
export function getWebSocketUrl() {
  if (API_BASE_URL) {
    const wsBase = API_BASE_URL.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    return `${wsBase}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Centralized fetch helper with token attachment and full URL resolution
 */
export async function apiFetch(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const token =
    sessionStorage.getItem('nmd_jwt_token') ||
    localStorage.getItem('nmd_jwt_token');

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Centralized API client with standard HTTP verbs
 * Example: api.post('/api/auth/login', { identifier, password })
 */
export const api = {
  get: (endpoint, options = {}) =>
    apiFetch(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, data, options = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  put: (endpoint, data, options = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  patch: (endpoint, data, options = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  delete: (endpoint, options = {}) =>
    apiFetch(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
