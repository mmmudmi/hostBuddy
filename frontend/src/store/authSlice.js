import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authAPI from '../utils/api/authAPI';
import { parseErrorResponse } from '../utils/errorUtils';

// Helper functions for token management
const getStoredToken = () => {
  const token = localStorage.getItem('token');
  const expiresAt = localStorage.getItem('tokenExpiresAt');
  
  if (token && expiresAt) {
    const now = new Date().getTime();
    const expiration = new Date(expiresAt).getTime();
    
    // If token is expired, remove it
    if (now >= expiration) {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiresAt');
      return null;
    }
    
    return token;
  }
  
  return null;
};

const storeToken = (token, expiresAt) => {
  localStorage.setItem('token', token);
  localStorage.setItem('tokenExpiresAt', expiresAt);
};

const clearStoredToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiresAt');
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(email, password);
      storeToken(response.access_token, response.expires_at);
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const autoLogin = createAsyncThunk(
  'auth/autoLogin',
  async (_, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('No valid token found');
      }
      
      // Verify token is still valid by fetching user data
      const response = await authAPI.getCurrentUser();
      return { user: response, token };
    } catch (error) {
      clearStoredToken();
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return response;
    } catch (error) {
      return rejectWithValue(parseErrorResponse(error));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: getStoredToken(),
    isLoading: false,
    error: null,
    isAuthenticated: !!getStoredToken(),
    tokenExpiresAt: localStorage.getItem('tokenExpiresAt'),
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.tokenExpiresAt = null;
      clearStoredToken();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.access_token;
        state.tokenExpiresAt = action.payload.expires_at;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.token = null;
        state.tokenExpiresAt = null;
        clearStoredToken();
      })
      // Auto login
      .addCase(autoLogin.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(autoLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(autoLogin.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.tokenExpiresAt = null;
        state.user = null;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;