import axios from "axios";

const instance = axios.create({
  baseURL: "https://sms-backend-1w30.onrender.com",
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default instance;