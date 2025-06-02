import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const result = await login(username, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Login failed. Please check your credentials.');
        }
      } else {
        const result = await register(username, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-logo">
        Bubble Tea <span>Diaries</span>
      </div>
      
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} id="auth-form">
        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            id="username-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            id="password-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <button type="submit" disabled={loading}>
            {loading ? (isLogin ? 'Logging in...' : 'Registering...') : (isLogin ? 'Login' : 'Register')}
          </button>
        </div>
      </form>
      
      <div className="auth-toggle">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button id="swap"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          disabled={loading}
        >
          {isLogin ? 'Register' : 'Login'}
        </button>
      </div>
    </div>
  );
}

export default LoginRegister;