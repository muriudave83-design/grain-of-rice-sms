import axios from "axios";

// 🌍 ENV CONFIG (WORKS IN DEV + PROD)
const API_URL = import.meta.env.VITE_API_URL;

// 🧠 DEBUG (optional but useful)
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
      console.warn("⚠️ No valid token found");
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
  if (!error.response) return "Network error. Check your connection.";

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

    // 🔐 AUTH HANDLING
    if (error.response) {
      const status = error.response.status;
      const token = localStorage.getItem("token");

      if (
        (status === 401 || status === 403) &&
        token &&
        token !== "null" &&
        token !== "undefined"
      ) {
        const isOnLoginPage = window.location.pathname === "/login";

        if (!isOnLoginPage) {
          console.warn("🔁 Session expired → redirecting to login");

          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");

          window.location.href = "/login";
        }
      }
    }

    // 🔥 GLOBAL ERROR FEEDBACK
    if (!error.config?.silent) {
      alert(message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;