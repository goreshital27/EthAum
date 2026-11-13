import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Ensures httpOnly JWT cookies are sent with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
