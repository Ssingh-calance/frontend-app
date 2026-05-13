import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { message } from 'antd';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally add an interceptor to attach the Destination Procore token if needed for backend validation
apiClient.interceptors.request.use((config) => {
  const { token, refreshToken, companyId, organizationId } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (refreshToken) {
    config.headers['x-procore-refresh-token'] = refreshToken;
  }
  if (companyId) {
    config.headers['x-procore-company-id'] = companyId;
  }
  if (organizationId) {
    config.headers['x-procore-organization-id'] = organizationId;
  }
  return config;
});

// Response interceptor to handle 401 Unauthorized and token updates
apiClient.interceptors.response.use(
  (response) => {
    // Check for updated tokens from the backend
    const newToken = response.headers['x-new-token'];
    const newRefreshToken = response.headers['x-new-refresh-token'];

    if (newToken) {
      console.log('Received updated access token from backend');
      useAuthStore.getState().setToken(newToken, newRefreshToken);
    } else if (newRefreshToken) {
      useAuthStore.getState().setRefreshToken(newRefreshToken);
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // If we still get a 401, it means the refresh failed or was not possible
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = '/login';
    } else {
      const errorMsg = error.response?.data?.detail || error.message || 'An unexpected error occurred';
      message.error(errorMsg);
    }
    return Promise.reject(error);
  }
);
