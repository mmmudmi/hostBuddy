import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import eventAPI from '../utils/api/eventAPI';
import { parseErrorResponse } from '../utils/errorUtils';

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await eventAPI.getEvents();
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData, { rejectWithValue }) => {
    try {
      const response = await eventAPI.createEvent(eventData);
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ id, eventData }, { rejectWithValue }) => {
    try {
      const response = await eventAPI.updateEvent(id, eventData);
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (id, { rejectWithValue }) => {
    try {
      await eventAPI.deleteEvent(id);
      return id;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await eventAPI.getEventById(id);
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

const eventSlice = createSlice({
  name: 'events',
  initialState: {
    events: [],
    currentEvent: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch events
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create event
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events.push(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update event
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(event => event.event_id === action.payload.event_id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        state.currentEvent = action.payload;
      })
      // Delete event
      .addCase(deleteEvent.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event.event_id !== action.payload);
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Fetch event by ID
      .addCase(fetchEventById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentEvent } = eventSlice.actions;
export default eventSlice.reducer;