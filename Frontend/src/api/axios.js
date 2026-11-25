import axios from "axios";

const api = axios.create({
  // Keep the client fallback aligned with Backend/index.js. Deployments can
  // still override this with VITE_API_BASE_URL.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:10000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("acadex_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.message) {
    if (Array.isArray(data.errors) && data.errors.length) {
      return `${data.message}: ${data.errors.join(", ")}`;
    }
    return data.message;
  }
  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
