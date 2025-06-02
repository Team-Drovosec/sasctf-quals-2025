import React from 'react';
import CommentItem from './CommentItem';

const CommentList = ({ comments, limit = null }) => {
  if (!comments || comments.length === 0) {
    return <div className="no-comments">No comments yet. Be the first to comment!</div>;
  }
  
  const displayComments = limit ? comments.slice(-limit) : comments;
  
  return (
    <div className="comments-list">
      {displayComments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
};

export default CommentList;