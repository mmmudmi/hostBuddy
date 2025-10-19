import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../store/authSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnimatedBackground from '../../components/AnimatedBackground';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);
  
  // Debug error state
  useEffect(() => {
  }, [error, isLoading, isAuthenticated]);
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();    
    // Dispatch the action without unwrap() to let Redux handle the error state
    const resultAction = await dispatch(loginUser({
      email: formData.email,
      password: formData.password,
    }));
    
    if (loginUser.fulfilled.match(resultAction)) {
      navigate('/dashboard');
    } else {
      console.error('Login failed:', resultAction.payload || resultAction.error);}
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="auth-container background" style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      
      {/* Floating Error Message */}
      {error && (
        <div className="floating-error-message">
          <span>{error}</span>
          <button 
            onClick={() => dispatch(clearError())}
            className="error-close-btn"
            aria-label="Close error message"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="auth-card" style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="auth-title">Welcome Back</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        
        <div className="auth-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;