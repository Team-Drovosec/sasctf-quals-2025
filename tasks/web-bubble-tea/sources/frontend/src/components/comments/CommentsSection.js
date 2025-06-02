import React from 'react';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

const CommentsSection = ({
  postId,
  userId,
  comments,
  loading,
  commentInput,
  submittingComment,
  onCommentSubmit,
  onCommentInputChange,
  onViewPost
}) => {
  return (
    <div className="comments-section">
      {loading ? (
        <div className="comments-loading">Loading comments...</div>
      ) : (
        <>
          <CommentList comments={comments} limit={3} />
          
          <CommentForm
            value={commentInput}
            onChange={onCommentInputChange}
            onSubmit={(e) => onCommentSubmit(e, userId, postId)}
            submitting={submittingComment}
          />
          
          {comments && comments.length > 3 && (
            <button 
              className="view-all-comments-btn"
              onClick={() => onViewPost(userId, postId)}
            >
              View all {comments.length} comments
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default CommentsSection;