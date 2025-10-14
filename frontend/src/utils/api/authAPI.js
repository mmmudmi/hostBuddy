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

  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/me/profile', profileData);
    return response.data;
  },

  updatePassword: async (passwordData) => {
    const response = await apiClient.put('/auth/me/password', passwordData);
    return response.data;
  },

  deleteAccount: async (deleteData) => {
    const response = await apiClient.delete('/auth/me', { data: deleteData });
    return response.data;
  },
};

export default authAPI;