import React from 'react';

const PostActionsMenu = ({ 
  post, 
  position, 
  isUserPost,
  onEdit,
  onView,
  onDelete,
  currentUserId
}) => {
  if (!position) return null;
  
  return (
    <div 
      className="post-menu"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isUserPost ? (
        // Menu for user's own posts
        <>
          <button 
            className="post-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(post);
            }}
          >
            Update Post
          </button>
          <button 
            className="post-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              onView(post.user_id, post.id);
            }}
          >
            View Post
          </button>
          <button 
            className="post-menu-item delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(post.user_id, post.id);
            }}
          >
            Delete Post
          </button>
        </>
      ) : (
        // Menu for other users' posts - just view post
        <button 
          className="post-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onView(post.user_id, post.id);
          }}
        >
          View Post
        </button>
      )}
    </div>
  );
};

export default PostActionsMenu;