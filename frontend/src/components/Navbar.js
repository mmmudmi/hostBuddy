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
        <Link to="/">
          <img src="svg/logo_black.svg" alt="Host Buddy Logo" style={{height: '40px', marginRight: '8px'}} />
        </Link>
        
        <div style={styles.navLinks}>
          {isAuthenticated ? (
            <>
              {/* <Link to="/dashboard" style={styles.navLink}>
                Dashboard
              </Link> */}
              <span style={styles.userInfo}>
                Welcome, {user?.name}
              </span>
              <Link to="/settings" className="btn btn-transparent" style={{fontSize: '1.5pc', marginRight: '-1pc'}}>
                <i className="fa-solid fa-circle-user"></i>
              </Link>
              <button 
                onClick={handleLogout}
                className="btn btn-transparent"
                style={{fontSize: '0.9rem'}}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-transparent">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary">
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
    padding: '0.4rem 0',
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
    fontWeight: 'bold',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    // gap: '1rem',
  },
  navLink: {
    textDecoration: 'none',
    color: '#374151',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
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