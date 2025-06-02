import React from 'react';

const FloatingActionButton = ({ onClick }) => {
  return (
    <button className="create-post-button" onClick={onClick}>
      +
    </button>
  );
};

export default FloatingActionButton;