// Central API client for all backend communication
// Place this at: src/services/api.js in your frontend project

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── TOKEN MANAGEMENT ──────────────────────────────────────────────────────
// Store JWT in memory (most secure for SPAs — not localStorage)
let _token = null;

export const setToken = (token) => { _token = token; };
export const clearToken = () => { _token = null; };
export const getToken = () => _token;

// ── BASE FETCH ─────────────────────────────────────────────────────────────
const request = async (endpoint, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
};

// ── AUTH ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),
};

// ── EVIDENCE ──────────────────────────────────────────────────────────────
export const evidenceAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/evidence${qs ? '?' + qs : ''}`);
  },

  getById: (id) => request(`/evidence/${id}`),

  upload: (formData) => {
    // Use raw fetch for multipart/form-data — don't set Content-Type header
    return fetch(`${BASE_URL}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${_token}` },
      body: formData, // FormData object — browser sets boundary automatically
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      return data;
    });
  },

  transfer: (id, toUserId, reason) =>
    request(`/evidence/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toUserId, reason }),
    }),

  verify: (id) =>
    request(`/evidence/${id}/verify`, { method: 'POST' }),

  batchVerify: (evidenceIds) =>
    request('/evidence/batch-verify', {
      method: 'POST',
      body: JSON.stringify({ evidenceIds }),
    }),
};

// ── USERS ─────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/users${qs ? '?' + qs : ''}`);
  },

  getById: (id) => request(`/users/${id}`),

  create: (data) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) =>
    request(`/users/${id}`, { method: 'DELETE' }),

  unlock: (id) =>
    request(`/users/${id}/unlock`, { method: 'POST' }),
};

// ── REPORTS ───────────────────────────────────────────────────────────────
export const reportsAPI = {
  // Returns a blob (PDF binary)
  generate: async (params) => {
    const res = await fetch(`${BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Report generation failed');
    }

    // Returns blob for direct download
    const blob = await res.blob();
    return blob;
  },
};

// ── AUDIT ─────────────────────────────────────────────────────────────────
export const auditAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit${qs ? '?' + qs : ''}`);
  },
};

// ── TEAMS ─────────────────────────────────────────────────────────────────
export const teamsAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/teams${qs ? '?' + qs : ''}`);
  },
  getById: (id) => request(`/teams/${id}`),
  create: (data) =>
    request('/teams', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) =>
    request(`/teams/${id}`, { method: 'DELETE' }),
};
