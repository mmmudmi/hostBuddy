import apiClient from './apiClient';

const layoutAPI = {
  getLayouts: async (eventId) => {
    const response = await apiClient.get(`/layouts?event_id=${eventId}`);
    return response.data;
  },

  getLayoutById: async (id) => {
    const response = await apiClient.get(`/layouts/${id}`);
    return response.data;
  },

  createLayout: async (layoutData) => {
    const response = await apiClient.post('/layouts', layoutData);
    return response.data;
  },

  updateLayout: async (id, layoutData) => {
    const response = await apiClient.put(`/layouts/${id}`, layoutData);
    return response.data;
  },

  deleteLayout: async (id) => {
    const response = await apiClient.delete(`/layouts/${id}`);
    return response.data;
  },
};

export default layoutAPI;