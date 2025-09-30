import apiClient from './apiClient';

const eventAPI = {
  getEvents: async () => {
    const response = await apiClient.get('/events');
    return response.data;
  },

  getEventById: async (id) => {
    // Validate ID - handle both string and number IDs
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0 || !id) {
      throw new Error(`Invalid event ID: ${id}`);
    }
    const response = await apiClient.get(`/events/${numericId}`);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  },

  updateEvent: async (id, eventData) => {
    // Validate ID - handle both string and number IDs
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0 || !id) {
      throw new Error(`Invalid event ID: ${id}`);
    }
    const response = await apiClient.put(`/events/${numericId}`, eventData);
    return response.data;
  },

  deleteEvent: async (id) => {
    // Validate ID - handle both string and number IDs
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0 || !id) {
      throw new Error(`Invalid event ID: ${id}`);
    }
    const response = await apiClient.delete(`/events/${numericId}`);
    return response.data;
  },
};

export default eventAPI;