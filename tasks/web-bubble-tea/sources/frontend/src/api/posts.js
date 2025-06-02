import api from './index';

export const postsAPI = {
  getPosts: (page = 1, perPage = 5) => 
    api.get(`/api/posts?page=${page}&per_page=${perPage}`),
  
  getPost: (userId, postId) => 
    api.get(`/api/posts/user/${userId}/posts/${postId}`),
  
  createPost: (content, isPrivate = false) => 
    api.post(`/api/posts`, { content, is_private: isPrivate }),
  
  updatePost: (userId, postId, content) => 
    api.put(`/api/posts/user/${userId}/posts/${postId}`, { content }),
  
  deletePost: (userId, postId) => 
    api.delete(`/api/posts/user/${userId}/posts/${postId}`)
};