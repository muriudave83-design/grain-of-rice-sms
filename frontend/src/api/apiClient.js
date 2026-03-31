import axios from "axios";

const API = axios.create({
  baseURL: "https://sms-backend-1w30.onrender.com/api",
  withCredentials: true,
});

// --------------------------------------------------
// REQUEST INTERCEPTOR
// --------------------------------------------------
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --------------------------------------------------
// RESPONSE INTERCEPTOR
// --------------------------------------------------
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // 🔐 401 - UNAUTHENTICATED
    if (status === 401) {
      console.warn("🔐 401 Unauthorized:", message || "Session issue");

      // ❗ DO NOT force logout automatically
      // Let UI decide what to do (e.g., show modal or toast)

      // Optional: mark session as expired
      error.isAuthError = true;
    }

    // 🚫 403 - FORBIDDEN
    if (status === 403) {
      console.warn("🚫 403 Forbidden:", message || "Access denied");

      // Optional flag for UI handling
      error.isPermissionError = true;
    }

    // ⚠️ NETWORK / SERVER ERRORS
    if (!status) {
      console.error("🌐 Network error or server unreachable");
    }

    return Promise.reject(error);
  }
);

export default API;