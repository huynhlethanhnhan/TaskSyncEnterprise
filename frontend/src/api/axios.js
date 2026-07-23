import axios from "axios";
import { tokenService } from "../services/tokenService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Reads the latest token dynamically at request time
api.interceptors.request.use((config) => {
  const token = tokenService.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers) {
    delete config.headers.Authorization;
  }
  return config;
});

// Response Interceptor: Prevents concurrent refresh loops & handles 401 gracefully
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        tokenService.clear();
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      try {
        const refreshUrl = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"}/auth/refresh`;
        const res = await axios.post(refreshUrl, { refresh_token: refreshToken });

        const { access_token, refresh_token } = res.data;
        tokenService.setTokens(access_token, refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        tokenService.clear();
        localStorage.removeItem("user");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;