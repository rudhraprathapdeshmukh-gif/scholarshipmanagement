/**
 * ScholarHub API Client
 * Securely communicates with the backend, managing JWT Bearer tokens and JSON requests.
 */

const API_BASE = '/api';

const api = {
  // Get stored authentication token
  getToken() {
    return localStorage.getItem('scholarhub_token');
  },

  // Save authentication token
  setToken(token) {
    if (token) {
      localStorage.setItem('scholarhub_token', token);
    } else {
      localStorage.removeItem('scholarhub_token');
    }
  },

  // Get current user stored in session
  getUser() {
    try {
      const data = localStorage.getItem('scholarhub_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // Store user in session
  setUser(user) {
    if (user) {
      localStorage.setItem('scholarhub_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('scholarhub_user');
    }
  },

  // Universal request handler
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // If unauthorized or expired token, clear storage
        if (response.status === 401 || response.status === 403) {
          if (token && (data.message && data.message.toLowerCase().includes('expired'))) {
            this.setToken(null);
            this.setUser(null);
            window.location.reload();
          }
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Helper shortcuts
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
