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
// 🚨 RESPONSE INTERCEPTOR (SAFE VERSION)
// ==============================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API ERROR:", error.response || error.message);

    if (error.response) {
      const status = error.response.status;

      // 🔥 ONLY logout if token exists AND clearly invalid
      const token = localStorage.getItem("token");

      if ((status === 401 || status === 403) && token) {
        console.warn("⚠️ Possible session issue detected");

        // ⚠️ DO NOT instantly logout (prevents login race bug)
        // Instead, allow ProtectedRoute to handle auth state

        // OPTIONAL: only logout if NOT during app init
        const isOnLoginPage = window.location.pathname === "/login";

        if (!isOnLoginPage) {
          console.warn("🔁 Redirecting to login (safe)");

          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");

          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;