import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginRegister from './pages/LoginRegister';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PostView from './pages/PostView';
import PrivateRoute from './components/PrivateRoute';
import './styles/index.css';
import './styles/modals.css';

function AuthWrapper({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return children(isAuthenticated);
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={
            <AuthWrapper>
              {(isAuth) => isAuth ? <Navigate to="/dashboard" /> : <LoginRegister />}
            </AuthWrapper>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/post/:userId/posts/:postId" element={
            <PrivateRoute>
              <PostView />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
