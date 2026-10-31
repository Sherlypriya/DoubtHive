import axios from 'axios';

// Read API base URL from Vite environment variable.
// In production (Vercel), set VITE_API_URL to your Render backend API URL (e.g. https://doubthive-api.onrender.com/api).
// In local development, defaults to '/api' to use Vite's dev proxy (http://localhost:5000).
const rawApiUrl = import.meta.env.VITE_API_URL;
const baseURL = rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, '') : '/api';

const axiosClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
