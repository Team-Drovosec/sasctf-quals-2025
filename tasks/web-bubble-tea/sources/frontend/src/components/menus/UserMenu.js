import React, { useState, useRef, useEffect } from 'react';

const UserMenu = ({ currentUser, onLogout, onProfileClick }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleProfileClick = () => {
    setShowUserMenu(false);
    onProfileClick();
  };
  
  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };
  
  return (
    <div className="user-menu-container" ref={userMenuRef}>
      <button 
        className="user-button" 
        onClick={() => setShowUserMenu(!showUserMenu)}
      >
        @{currentUser?.username || 'User'}
      </button>
      
      {showUserMenu && (
        <div className="user-menu">
          <button 
            className="menu-item"
            onClick={handleProfileClick}
          >
            Profile
          </button>
          <button 
            className="menu-item logout" 
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
