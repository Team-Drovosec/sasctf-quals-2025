import React from 'react';

const PostContent = ({ content }) => {
  return (
    <div className="post-content">
      {content ? (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <div className="empty-content">No content</div>
      )}
    </div>
  );
};

export default PostContent;