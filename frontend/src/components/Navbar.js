import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav style={styles.navbar}>
      <div className="container" style={styles.navContainer}>
        <Link to="/" style={styles.logo}>
          Host Buddy
        </Link>
        
        <div style={styles.navLinks}>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" style={styles.navLink}>
                Dashboard
              </Link>
              <span style={styles.userInfo}>
                Welcome, {user?.full_name || user?.email}
              </span>
              <button 
                onClick={handleLogout}
                style={{...styles.navLink, ...styles.logoutBtn}}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.navLink}>
                Login
              </Link>
              <Link to="/signup" style={{...styles.navLink, ...styles.signupBtn}}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    background: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#3b82f6',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navLink: {
    textDecoration: 'none',
    color: '#374151',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
  },
  signupBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  userInfo: {
    color: '#6b7280',
    fontSize: '14px',
  },
};

export default Navbar;