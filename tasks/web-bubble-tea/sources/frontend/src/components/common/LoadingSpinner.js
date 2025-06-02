import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="loading">{message}</div>
);

export default LoadingSpinner;