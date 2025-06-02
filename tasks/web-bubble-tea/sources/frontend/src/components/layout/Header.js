import React from 'react';
import UserMenu from '../menus/UserMenu';

const Header = ({ currentUser, onLogout, onProfileClick }) => {
  return (
    <div className="header">
      <h2>Bubble Tea Diaries</h2>
      <UserMenu 
        currentUser={currentUser}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
      />
    </div>
  );
};

export default Header;