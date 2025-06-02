import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../api/users';

function Profile() {
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  useEffect(() => {
    fetchUserData();
  }, []);
  
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getProfile();
      if (response.data && response.data.user) {
        setUserData(response.data.user);
        setNewUsername(response.data.user.username || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    
    if (!newUsername || newUsername.trim().length < 3) {
      setUpdateError('Username must be at least 3 characters');
      return;
    }
    
    try {
      setUpdateError(null);
      const response = await usersAPI.updateProfile(newUsername);
      
      if (response.data && response.data.user) {
        updateCurrentUser(response.data.user);
        setUserData(response.data.user);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error updating username:', error);
      setUpdateError(error.response?.data?.error || 'Failed to update username');
    }
  };
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>User Profile</h2>
        <button className="back-btn" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading profile...</div>
      ) : userData ? (
        <div className="profile-content">
          <div className="profile-info">
            <div className="info-row">
              <span className="label">Username:</span>
              <span className="value">
                @{typeof userData.username === 'string' ? userData.username : 'User'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">User ID:</span>
              <span className="value">{userData.id}</span>
            </div>
            <div className="info-row">
              <span className="label">Created At:</span>
              <span className="value">
                {userData.created_at ? new Date(userData.created_at).toLocaleString() : 'Unknown'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Last Login:</span>
              <span className="value">
                {userData.last_login ? new Date(userData.last_login).toLocaleString() : 'Unknown'}
              </span>
            </div>
          </div>
          
          <div className="update-section">
            <h3>Update Username</h3>
            {updateError && (
              <div className="error-message">{updateError}</div>
            )}
            {updateSuccess && (
              <div className="success-message">Username updated successfully!</div>
            )}
            <form onSubmit={handleUpdateUsername}>
              <div className="form-group">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="New username"
                  minLength={3}
                  maxLength={50}
                  required
                />
                <button type="submit">Update</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="error-message">Failed to load profile data</div>
      )}
    </div>
  );
}

export default Profile;