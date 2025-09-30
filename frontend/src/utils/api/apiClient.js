import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    // Check if token is expired before using it
    if (token && expiresAt) {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      
      if (now >= expiration) {
        // Token is expired, remove it
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiresAt');
        return config;
      }
      
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information for debugging
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      }
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiresAt');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;