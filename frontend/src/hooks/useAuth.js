import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { autoLogin, logout } from '../store/authSlice';

/**
 * Hook to handle automatic login when the app starts
 * Checks for valid stored tokens and attempts to restore session
 */
export const useAutoLogin = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only attempt auto-login if:
    // 1. Not already authenticated
    // 2. Not currently loading
    // 3. No user data
    // 4. There's a stored token
    if (!isAuthenticated && !isLoading && !user && token) {
      dispatch(autoLogin());
    }
  }, [dispatch, isAuthenticated, isLoading, user, token]);

  return { isAuthenticated, isLoading };
};

/**
 * Hook to check if token is about to expire and handle refresh
 */
export const useTokenRefresh = () => {
  const { tokenExpiresAt, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAuthenticated || !tokenExpiresAt) return;

    const checkTokenExpiration = () => {
      const now = new Date().getTime();
      const expiration = new Date(tokenExpiresAt).getTime();
      const timeUntilExpiry = expiration - now;

      // If token expires in less than 1 day, logout user
      if (timeUntilExpiry < 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
        console.log('Token expiring within 24 hours, logging out user');
        dispatch(logout());
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every hour
    const interval = setInterval(checkTokenExpiration, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [tokenExpiresAt, isAuthenticated, dispatch]);
};