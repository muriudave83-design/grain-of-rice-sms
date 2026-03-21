import axios from "axios";

console.log("API URL:", import.meta.env.VITE_API_URL);

// Ensure API URL is defined
const API_URL = import.meta.env.VITE_API_URL;

if (import.meta.env.DEV) {
  console.log("🌍 API Base URL:", API_URL);
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // req uired for cookies if using them
});

// 🔐 Attach token from localStorage (if present)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔐 GLOBAL 401 HANDLER
// 🔐 GLOBAL 401 HANDLER
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn("⚠️ 401 detected — TEMP ignore during debug");
      return Promise.reject(error); // 🚫 DO NOT remove token
    }

    return Promise.reject(error);
  }
);

export default apiClient;
