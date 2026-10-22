/**
 * Centralized API Client & Endpoint Resolver for Natural Milk Dairy
 * Supports:
 * - Local Development (localhost:3000 -> localhost:5000 via Vite proxy)
 * - Production Domains (Vercel -> Render backend https://naturalmilkdiary.onrender.com)
 * - Custom Domains / VPS (Nginx + PM2)
 */

const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.'));

// Smart Base URL resolver:
// 1. Explicit VITE_API_URL if provided
// 2. If running on remote domain (e.g. Vercel), fallback to production Render backend
// 3. If running on localhost/LAN, default to relative '' so Vite proxy forwards to port 5000
const resolveBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  if (isBrowser && !isLocalhost) {
    return 'https://naturalmilkdiary.onrender.com';
  }
  return '';
};

export const API_BASE_URL = resolveBaseUrl();

/**
 * Resolves an endpoint to a full URL.
 * @param {string} endpoint - e.g. '/api/auth/login'
 * @returns {string} - full URL or relative path
 */
export function getApiUrl(endpoint = '') {
  if (!endpoint) return API_BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Resolves WebSocket URL pointing to the appropriate server.
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
 * Safely parse JSON from a fetch Response without throwing SyntaxError
 */
export async function safeResponseJson(res) {
  try {
    const text = await res.clone().text();
    if (!text || text.trim() === '') {
      return {
        success: false,
        status: res.status,
        message: res.status >= 500
          ? 'Backend server error (500). Please ensure server is running.'
          : `Empty response from server (${res.status})`,
      };
    }
    return JSON.parse(text);
  } catch (err) {
    return {
      success: false,
      status: res.status,
      message: res.status >= 500
        ? 'Backend service error. Please verify server connection.'
        : 'Invalid response from server.',
    };
  }
}

/**
 * Centralized fetch helper with token attachment, URL resolution, and safe JSON parsing
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

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Attach safe json method so callers can do `await res.json()` without crash
    res.json = () => safeResponseJson(res);
    return res;
  } catch (netErr) {
    // Return a synthesized Response so caller does not crash ungracefully
    const synthetic = new Response(
      JSON.stringify({
        success: false,
        message: 'Could not reach backend server. Please verify your connection or server status.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
    synthetic.json = () => safeResponseJson(synthetic);
    return synthetic;
  }
}

/**
 * Centralized API client with standard HTTP verbs
 * Example: await api.post('/api/auth/login', { identifier, password })
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

  safeJson: safeResponseJson,
};

export default api;
