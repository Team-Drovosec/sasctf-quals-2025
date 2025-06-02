import api from './index';

export const authAPI = {
  login: (username, password) => 
    api.post('/api/auth/login', { username, password }),
  
  register: (username, password) => 
    api.post('/api/auth/register', { username, password }),
  
  logout: () => 
    api.post('/api/auth/logout'),
  
  getCurrentUser: () => 
    api.get('/api/users/me')
};