import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile, updateUserPassword, deleteUserAccount } from '../store/authSlice';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [deleteForm, setDeleteForm] = useState({
    password: '',
    confirmation: ''
  });
  
  // Loading states for different sections
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Error states
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  // Success messages
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);
    
    try {
      // Only send fields that have changed
      const updateData = {};
      if (profileForm.name !== user.name) {
        updateData.name = profileForm.name;
      }
      if (profileForm.email !== user.email) {
        updateData.email = profileForm.email;
      }
      
      if (Object.keys(updateData).length === 0) {
        setProfileError('No changes detected');
        setProfileLoading(false);
        return;
      }
      
      await dispatch(updateUserProfile(updateData)).unwrap();
      setProfileSuccess('Profile updated successfully!');
    } catch (error) {
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }
    
    try {
      await dispatch(updateUserPassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      })).unwrap();
      
      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    
    if (deleteForm.confirmation.toUpperCase() !== 'DELETE') {
      setDeleteError('You must type "DELETE" to confirm');
      setDeleteLoading(false);
      return;
    }
    
    try {
      await dispatch(deleteUserAccount({
        password: deleteForm.password,
        confirmation: deleteForm.confirmation
      })).unwrap();
      
      // Account deleted successfully, redirect to home
      navigate('/');
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '2rem', color: '#333' }}>Account Settings</h1>
      
      {/* Profile Information Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Profile Information</h2>
        <form onSubmit={handleProfileSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          
          {profileError && <div style={styles.errorMessage}>{profileError}</div>}
          {profileSuccess && <div style={styles.successMessage}>{profileSuccess}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={profileLoading}
            style={styles.button}
          >
            {profileLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Change Password Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Change Password</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              style={styles.input}
              required
              minLength={6}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              style={styles.input}
              required
              minLength={6}
            />
          </div>
          
          {passwordError && <div style={styles.errorMessage}>{passwordError}</div>}
          {passwordSuccess && <div style={styles.successMessage}>{passwordSuccess}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={passwordLoading}
            style={styles.button}
          >
            {passwordLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Delete Account Section */}
      <div style={{ ...styles.section, ...styles.dangerSection }}>
        <h2 style={{ ...styles.sectionTitle, color: '#d32f2f' }}>Delete Account</h2>
        <p style={styles.warningText}>
          <strong>Warning:</strong> This action cannot be undone. All your events, layouts, and custom elements will be permanently deleted.
        </p>
        
        <form onSubmit={handleDeleteSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Enter your password to confirm</label>
            <input
              type="password"
              value={deleteForm.password}
              onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Type "DELETE" to confirm</label>
            <input
              type="text"
              value={deleteForm.confirmation}
              onChange={(e) => setDeleteForm({ ...deleteForm, confirmation: e.target.value })}
              style={styles.input}
              placeholder="Type DELETE here"
              required
            />
          </div>
          
          {deleteError && <div style={styles.errorMessage}>{deleteError}</div>}
          
          <button 
            type="submit" 
            style={{ ...styles.button, backgroundColor: '#d32f2f', borderColor: '#d32f2f' }}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  section: {
    backgroundColor: '#fff',
    padding: '2rem',
    marginBottom: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  dangerSection: {
    border: '2px solid #ffebee',
  },
  sectionTitle: {
    marginBottom: '1.5rem',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#333',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  button: {
    marginTop: '1rem',
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
  successMessage: {
    color: '#2e7d32',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
  warningText: {
    color: '#d32f2f',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    border: '1px solid #ffcdd2',
  },
};

export default Settings;