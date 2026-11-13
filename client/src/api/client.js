import axios from 'axios';

// All requests go through the Vite dev proxy (/api → Express :5000)
const api = axios.create({ baseURL: '/api' });

// Extract the server's error message consistently
export const getErr = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.error?.message || fallback;

export default api;
