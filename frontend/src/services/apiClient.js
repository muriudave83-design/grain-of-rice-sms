import axios from "axios";

// 🔥 PRODUCTION BACKEND (Render ONLY)
const API_URL = "https://sms-backend-1w30.onrender.com/api";

console.log("🌍 API URL:", API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
});

// 🔐 Attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    console.log("🔑 TOKEN:", token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ❗ KEEP THIS (important for debugging)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API ERROR:", error.response || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;