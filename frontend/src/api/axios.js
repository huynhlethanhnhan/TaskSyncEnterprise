import axios from "axios";
import { tokenService } from "../services/tokenService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = tokenService.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"}/auth/refresh`, {
          refresh_token: tokenService.getRefreshToken()
        });
        tokenService.setTokens(res.data.access_token, res.data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
        return api(originalRequest);
      } catch {
        tokenService.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
export default api;