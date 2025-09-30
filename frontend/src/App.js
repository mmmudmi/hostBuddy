import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from './store/authSlice';
import { useAutoLogin, useTokenRefresh } from './hooks/useAuth';
import PrivateRoute from './router/PrivateRoute';
import PublicRoute from './router/PublicRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import LayoutDesigner from './pages/LayoutDesigner';

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

import './App.css';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);
  
  // Handle automatic login on app startup
  useAutoLogin();
  
  // Handle token expiration monitoring
  useTokenRefresh();

  useEffect(() => {
    // Only fetch user data if authenticated but user data is missing
    if (isAuthenticated && !user && !isLoading) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated, user, isLoading]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            } 
          />

          {/* Private Routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/create-event" 
            element={
              <PrivateRoute>
                <CreateEvent />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/events/:id" 
            element={
              <PrivateRoute>
                <EventDetails />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/events/:id/edit" 
            element={
              <PrivateRoute>
                <CreateEvent />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/events/:id/layout" 
            element={
              <PrivateRoute>
                <LayoutDesigner />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;