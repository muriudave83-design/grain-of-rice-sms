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
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================
// 🔐 REQUEST INTERCEPTOR
// =====================================
apiClient.interceptors.request.use(
  (config) => {
    // 🚨 DO NOT attach token during login
    if (config.url?.includes("/auth/login")) {
      return config;
    }

    const token = localStorage.getItem("token");

    // 🧼 Ignore invalid tokens
    if (
      !token ||
      token === "null" ||
      token === "undefined" ||
      token.trim() === ""
    ) {
      return config;
    }

    // ✅ Ensure headers exist
    if (!config.headers) {
      config.headers = {};
    }

    // ✅ Attach token
    config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================
// 🧠 HELPER: EXTRACT ERROR MESSAGE
// =====================================
const getErrorMessage = (error) => {
  if (!error.response) {
    return "Network error";
  }

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

    // 🔐 Optional auth warning
    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        console.warn("⚠️ Unauthorized request");
      }
    }

    return Promise.reject({
      ...error,
      message,
    });
  }
);

export default apiClient;