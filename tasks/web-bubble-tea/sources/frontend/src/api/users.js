import api from './index';

export const usersAPI = {
  getProfile: () => 
    api.get('/api/users/me'),
  
  updateProfile: (username) => 
    api.put('/api/users/me', { username }),

  getUserProfile: (user_id) =>
    api.get(`/api/users/${user_id}`)
};