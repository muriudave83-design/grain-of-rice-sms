import axios from "axios";

// 🌍 ENV CONFIG (WORKS IN DEV + PROD)
const API_URL = import.meta.env.VITE_API_URL;

// 🧠 DEBUG
console.log("🌍 API URL:", API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
});

// ==============================
// 🔐 REQUEST INTERCEPTOR
// ==============================
apiClient.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");

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

// ==============================
// 🧠 HELPER: EXTRACT ERROR MESSAGE
// ==============================
const getErrorMessage = (error) => {
  if (!error.response) return "Network error";

  return (
    error.response.data?.message ||
    error.response.data?.error ||
    "Something went wrong"
  );
};

// ==============================
// 🚨 RESPONSE INTERCEPTOR
// ==============================
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

    // 🔐 AUTH HANDLING (FIXED — NO AUTO LOGOUT)
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
        // ❌ DO NOT redirect
        // ❌ DO NOT clear storage
      }
    }

    // ❌ NO GLOBAL ALERT
    return Promise.reject({
      ...error,
      message,
    });
  }
);

export default apiClient;