import axios from "axios";

console.log("API URL:", import.meta.env.VITE_API_URL);

// Ensure API URL is defined
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

if (import.meta.env.DEV) {
  console.log("🌍 API Base URL:", API_URL);
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // required for cookies if using them
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
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn("⚠️ Session expired. Logging out.");

      // Clear stored auth
      localStorage.removeItem("token");

      // Redirect safely
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
