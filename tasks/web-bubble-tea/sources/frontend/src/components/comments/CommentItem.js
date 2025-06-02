
import React from 'react';

const CommentItem = ({ comment }) => {
  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-author">
          @{comment.author}
        </span>
        {comment.created_at && (
          <span className="comment-date">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        )}
      </div>
      <div 
        className="comment-content"
        dangerouslySetInnerHTML={{ __html: comment.content }}
      />
    </div>
  );
};

export default CommentItem;
