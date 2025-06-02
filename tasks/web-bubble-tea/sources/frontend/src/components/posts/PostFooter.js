import React from 'react';
import { CommentIcon } from '../icons';

const PostFooter = ({ post, onToggleComments }) => {
  return (
    <div className="post-footer">
      <div className="post-actions-container">
        <div 
          className="post-actions"
          onClick={() => onToggleComments(post.user_id, post.id)}
        >
          <div className="comment-icon">
            <CommentIcon />
            <span className="comment-count">
              {post.comments_count || 0}
            </span>
          </div>
        </div>
        
        {post.created_at && (
          <span className="post-date">
            {new Date(post.created_at).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default PostFooter;