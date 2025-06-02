import React, { forwardRef } from 'react';
import PostHeader from './PostHeader';
import PostContent from './PostContent';
import PostFooter from './PostFooter';
import CommentsSection from '../comments/CommentsSection';

const PostCard = forwardRef(({ 
  post, 
  isExpanded, 
  comments,
  loadingComments,
  commentInput,
  submittingComment,
  onToggleComments,
  onMenuToggle,
  onCommentSubmit,
  onCommentInputChange,
  onViewPost
}, ref) => {
  return (
    <div className="post-card" ref={ref}>
      <PostHeader post={post} onMenuToggle={onMenuToggle} />
      <PostContent content={post.content} />
      <PostFooter post={post} onToggleComments={onToggleComments} />
      
      {isExpanded && (
        <CommentsSection
          postId={post.id}
          userId={post.user_id}
          comments={comments}
          loading={loadingComments}
          commentInput={commentInput}
          submittingComment={submittingComment}
          onCommentSubmit={onCommentSubmit}
          onCommentInputChange={onCommentInputChange}
          onViewPost={onViewPost}
        />
      )}
    </div>
  );
});

export default PostCard;