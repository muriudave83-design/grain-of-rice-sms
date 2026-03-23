import axios from "axios";

// 🔥 PRODUCTION BACKEND (Render ONLY)
const API_URL = "https://sms-backend-1w30.onrender.com/api";

console.log("🌍 API URL:", API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
});

// ==============================
// 🔐 REQUEST INTERCEPTOR
// ==============================
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

// ==============================
// 🚨 RESPONSE INTERCEPTOR (FIXED)
// ==============================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API ERROR:", error.response || error.message);

    // 🔥 CRITICAL FIX — HANDLE EXPIRED / INVALID TOKEN
    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        console.warn("⚠️ Session invalid or expired. Logging out...");

        // 🧹 CLEAR ALL AUTH DATA
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        // 🚫 PREVENT LOOP
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;