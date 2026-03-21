import axios from "axios";

const API = axios.create({
  baseURL: "https://sms-backend-1w30.onrender.com/api", // ✅ FIXED
  withCredentials: true, // ✅ ADD THIS
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;