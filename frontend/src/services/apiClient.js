import axios from "axios";

// =====================================
// 🌍 ENV CONFIG (DEV + PROD SAFE)
// =====================================
const API_URL = import.meta.env.VITE_API_URL;

// ❗ Fail fast if missing
if (!API_URL) {
  throw new Error("❌ VITE_API_URL is not defined in .env");
}

// 🧠 DEBUG
console.log("🌍 API URL:", API_URL);

// =====================================
// 🚀 AXIOS INSTANCE
// =====================================
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // future-proof (cookies if needed)
});

// =====================================
// 🔐 REQUEST INTERCEPTOR
// =====================================
apiClient.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");

    // 🧼 Clean invalid tokens
    if (
      !token ||
      token === "null" ||
      token === "undefined" ||
      token.trim() === ""
    ) {
      return config;
    }

    if (!config.headers) {
      config.headers = {};
    }

    config.headers["Authorization"] = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================
// 🧠 HELPER: EXTRACT ERROR MESSAGE
// =====================================
const getErrorMessage = (error) => {
  if (!error.response) return "Network error";

  return (
    error.response.data?.message ||
    error.response.data?.error ||
    "Something went wrong"
  );
};

// =====================================
// 🚨 RESPONSE INTERCEPTOR
// =====================================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getErrorMessage(error);

    console.error("❌ API ERROR:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message,
    });

    // 🔐 AUTH HANDLING (NO AUTO LOGOUT — GOOD DESIGN)
    if (error.response) {
      const status = error.response.status;
      const token = localStorage.getItem("token");

      if (
        (status === 401 || status === 403) &&
        token &&
        token !== "null" &&
        token !== "undefined"
      ) {
        console.warn("⚠️ Unauthorized request (ignored — no forced logout)");
      }
    }

    return Promise.reject({
      ...error,
      message,
    });
  }
);

export default apiClient;