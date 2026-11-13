import axios from 'axios';

// API base URL defaulting to http://localhost:5000
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

// Ensure axios baseURL points to the /api prefix
const axiosBaseURL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: axiosBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Builds full file URL from the API base URL for signed/raw links
 * @param {string} relativeUrl - E.g. /api/records/raw/...
 * @returns {string} Full URL e.g. http://localhost:5000/api/records/raw/...
 */
export const getFullFileUrl = (relativeUrl) => {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  const originBase = API_BASE_URL.replace(/\/api$/, '');
  const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${originBase}${cleanPath}`;
};

export default api;
