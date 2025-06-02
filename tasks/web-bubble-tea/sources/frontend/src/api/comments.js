import api from './index';

export const commentsAPI = {
  createComment: (userId, postId, content) => 
    api.post(`/api/comments/user/${userId}/posts/${postId}`, { content })
};