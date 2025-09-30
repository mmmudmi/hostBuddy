import apiClient from './apiClient';

const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authAPI;